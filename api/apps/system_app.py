#
#  Copyright 2024 The InfiniFlow Authors. All Rights Reserved.
#
#  Licensed under the Apache License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License
#
import logging
import os
from datetime import datetime
import json

from flask import request
from flask_login import login_required, current_user

from api.db.db_models import APIToken
from api.db.services.api_service import APITokenService
from api.db.services.knowledgebase_service import KnowledgebaseService
from api.db.services.user_service import UserTenantService, UserService
from api import settings
from api.utils import current_timestamp, datetime_format
from api.utils.api_utils import (
    get_json_result,
    get_data_error_result,
    server_error_response,
    generate_confirmation_token,
)
from api.utils.crypt import decrypt
from api.versions import get_ragflow_version
from rag.utils.storage_factory import STORAGE_IMPL, STORAGE_IMPL_TYPE
from timeit import default_timer as timer

from rag.utils.redis_conn import REDIS_CONN
from flask import jsonify
from api.utils.health_utils import run_health_checks


@manager.route("/version", methods=["GET"])  # noqa: F821
@login_required
def version():
    """
    Get the current version of the application.
    ---
    tags:
      - System
    security:
      - ApiKeyAuth: []
    responses:
      200:
        description: Version retrieved successfully.
        schema:
          type: object
          properties:
            version:
              type: string
              description: Version number.
    """
    return get_json_result(data=get_ragflow_version())


@manager.route("/status", methods=["GET"])  # noqa: F821
@login_required
def status():
    """
    Get the system status.
    ---
    tags:
      - System
    security:
      - ApiKeyAuth: []
    responses:
      200:
        description: System is operational.
        schema:
          type: object
          properties:
            es:
              type: object
              description: Elasticsearch status.
            storage:
              type: object
              description: Storage status.
            database:
              type: object
              description: Database status.
      503:
        description: Service unavailable.
        schema:
          type: object
          properties:
            error:
              type: string
              description: Error message.
    """
    res = {}
    st = timer()
    try:
        res["doc_engine"] = settings.docStoreConn.health()
        res["doc_engine"]["elapsed"] = "{:.1f}".format((timer() - st) * 1000.0)
    except Exception as e:
        res["doc_engine"] = {
            "type": "unknown",
            "status": "red",
            "elapsed": "{:.1f}".format((timer() - st) * 1000.0),
            "error": str(e),
        }

    st = timer()
    try:
        STORAGE_IMPL.health()
        res["storage"] = {
            "storage": STORAGE_IMPL_TYPE.lower(),
            "status": "green",
            "elapsed": "{:.1f}".format((timer() - st) * 1000.0),
        }
    except Exception as e:
        res["storage"] = {
            "storage": STORAGE_IMPL_TYPE.lower(),
            "status": "red",
            "elapsed": "{:.1f}".format((timer() - st) * 1000.0),
            "error": str(e),
        }

    st = timer()
    try:
        KnowledgebaseService.get_by_id("x")
        res["database"] = {
            "database": settings.DATABASE_TYPE.lower(),
            "status": "green",
            "elapsed": "{:.1f}".format((timer() - st) * 1000.0),
        }
    except Exception as e:
        res["database"] = {
            "database": settings.DATABASE_TYPE.lower(),
            "status": "red",
            "elapsed": "{:.1f}".format((timer() - st) * 1000.0),
            "error": str(e),
        }

    st = timer()
    try:
        if not REDIS_CONN.health():
            raise Exception("Lost connection!")
        res["redis"] = {
            "status": "green",
            "elapsed": "{:.1f}".format((timer() - st) * 1000.0),
        }
    except Exception as e:
        res["redis"] = {
            "status": "red",
            "elapsed": "{:.1f}".format((timer() - st) * 1000.0),
            "error": str(e),
        }

    task_executor_heartbeats = {}
    try:
        task_executors = REDIS_CONN.smembers("TASKEXE")
        now = datetime.now().timestamp()
        for task_executor_id in task_executors:
            heartbeats = REDIS_CONN.zrangebyscore(task_executor_id, now - 60 * 30, now)
            heartbeats = [json.loads(heartbeat) for heartbeat in heartbeats]
            task_executor_heartbeats[task_executor_id] = heartbeats
    except Exception:
        logging.exception("get task executor heartbeats failed!")
    res["task_executor_heartbeats"] = task_executor_heartbeats

    return get_json_result(data=res)


@manager.route("/healthz", methods=["GET"])  # noqa: F821
def healthz():
    result, all_ok = run_health_checks()
    return jsonify(result), (200 if all_ok else 500)


@manager.route("/ping", methods=["GET"])  # noqa: F821
def ping():
    return "pong", 200


@manager.route("/new_token", methods=["POST"])  # noqa: F821
@login_required
def new_token():
    """
    Generate a new API token.
    ---
    tags:
      - API Tokens
    security:
      - ApiKeyAuth: []
    parameters:
      - in: query
        name: name
        type: string
        required: false
        description: Name of the token.
    responses:
      200:
        description: Token generated successfully.
        schema:
          type: object
          properties:
            token:
              type: string
              description: The generated API token.
    """
    try:
        tenants = UserTenantService.query(user_id=current_user.id)
        if not tenants:
            return get_data_error_result(message="Tenant not found!")

        tenant_id = [tenant for tenant in tenants if tenant.role == "owner"][0].tenant_id
        obj = {
            "tenant_id": tenant_id,
            "token": generate_confirmation_token(tenant_id),
            "beta": generate_confirmation_token(generate_confirmation_token(tenant_id)).replace("ragflow-", "")[:32],
            "create_time": current_timestamp(),
            "create_date": datetime_format(datetime.now()),
            "update_time": None,
            "update_date": None,
        }

        if not APITokenService.save(**obj):
            return get_data_error_result(message="Fail to new a dialog!")

        return get_json_result(data=obj)
    except Exception as e:
        return server_error_response(e)


@manager.route("/token_list", methods=["GET"])  # noqa: F821
@login_required
def token_list():
    """
    List all API tokens for the current user.
    ---
    tags:
      - API Tokens
    security:
      - ApiKeyAuth: []
    responses:
      200:
        description: List of API tokens.
        schema:
          type: object
          properties:
            tokens:
              type: array
              items:
                type: object
                properties:
                  token:
                    type: string
                    description: The API token.
                  name:
                    type: string
                    description: Name of the token.
                  create_time:
                    type: string
                    description: Token creation time.
    """
    try:
        tenants = UserTenantService.query(user_id=current_user.id)
        if not tenants:
            return get_data_error_result(message="Tenant not found!")

        tenant_id = [tenant for tenant in tenants if tenant.role == "owner"][0].tenant_id
        objs = APITokenService.query(tenant_id=tenant_id)
        objs = [o.to_dict() for o in objs]
        for o in objs:
            if not o["beta"]:
                o["beta"] = generate_confirmation_token(generate_confirmation_token(tenants[0].tenant_id)).replace("ragflow-", "")[:32]
                APITokenService.filter_update([APIToken.tenant_id == tenant_id, APIToken.token == o["token"]], o)
        return get_json_result(data=objs)
    except Exception as e:
        return server_error_response(e)


@manager.route("/token/<token>", methods=["DELETE"])  # noqa: F821
@login_required
def rm(token):
    """
    Remove an API token.
    ---
    tags:
      - API Tokens
    security:
      - ApiKeyAuth: []
    parameters:
      - in: path
        name: token
        type: string
        required: true
        description: The API token to remove.
    responses:
      200:
        description: Token removed successfully.
        schema:
          type: object
          properties:
            success:
              type: boolean
              description: Deletion status.
    """
    APITokenService.filter_delete([APIToken.tenant_id == current_user.id, APIToken.token == token])
    return get_json_result(data=True)


@manager.route("/config", methods=["GET"])  # noqa: F821
def get_config():
    """
    Get system configuration.
    ---
    tags:
        - System
    responses:
        200:
            description: Return system configuration
            schema:
                type: object
                properties:
                    registerEnable:
                        type: integer 0 means disabled, 1 means enabled
                        description: Whether user registration is enabled
    """
    return get_json_result(data={"registerEnabled": settings.REGISTER_ENABLED})


@manager.route("/create_user_token", methods=["POST"])  # noqa: F821
def create_user_token():
    """
    通过用户名和密码创建用户 API 令牌
    ---
    tags:
      - API Tokens
    parameters:
      - in: body
        name: body
        description: 用户凭据和可选的令牌名称。
        required: true
        schema:
          type: object
          properties:
            email:
              type: string
              description: 用户邮箱。
            password:
              type: string
              description: 用户密码（需要加密）。
            token_name:
              type: string
              description: 可选的令牌名称。
    responses:
      200:
        description: 令牌创建成功。
        schema:
          type: object
          properties:
            token:
              type: string
              description: 生成的 API 令牌。
    """
    try:
        if not request.json:
            return get_json_result(data=False, code=settings.RetCode.AUTHENTICATION_ERROR, message="Unauthorized!")

        email = request.json.get("email", "")
        password = request.json.get("password")

        # 验证输入
        if not email or not password:
            return get_json_result(data=False, code=settings.RetCode.AUTHENTICATION_ERROR, message="Email and password are required!")

        try:
            password = decrypt(password)
        except BaseException:
            return get_json_result(data=False, code=settings.RetCode.SERVER_ERROR, message="Fail to decrypt password")

        # 验证用户凭据
        user = UserService.query_user(email, password)
        if not user or not hasattr(user, "is_active") or user.is_active == "0":
            return get_json_result(data=False, code=settings.RetCode.AUTHENTICATION_ERROR, message="Invalid email or password!")

        # 获取用户租户信息
        tenants = UserTenantService.query(user_id=user.id)
        if not tenants:
            return get_data_error_result(message="Tenant not found!")

        tenant_id = [tenant for tenant in tenants if tenant.role == "owner"][0].tenant_id

        # 生成新的 API 令牌
        obj = {
            "tenant_id": tenant_id,
            "token": generate_confirmation_token(tenant_id),
            "beta": generate_confirmation_token(generate_confirmation_token(tenant_id)).replace("ragflow-", "")[:32],
            "create_time": current_timestamp(),
            "create_date": datetime_format(datetime.now()),
            "update_time": None,
            "update_date": None,
        }

        # 保存到数据库
        if not APITokenService.save(**obj):
            return get_data_error_result(message="Failed to create API token!")

        # 只返回令牌信息，不返回敏感信息
        return get_json_result(data={"token": obj["token"], "beta": obj["beta"], "create_time": obj["create_date"]})
    except Exception as e:
        logging.exception(e)
        return server_error_response(e)


@manager.route("/create_user_token_secure", methods=["POST"])  # noqa: F821
def create_user_token_secure():
    """
    使用预先配置的管理员密钥创建用户 API 令牌
    ---
    tags:
      - API Tokens
    parameters:
      - in: header
        name: Admin-API-Key
        type: string
        required: true
        description: 管理员 API 密钥。
      - in: body
        name: body
        description: 用户邮箱。
        required: true
        schema:
          type: object
          properties:
            email:
              type: string
              description: 用户邮箱。
            token_name:
              type: string
              description: 可选的令牌名称。
    responses:
      200:
        description: 令牌创建成功。
        schema:
          type: object
          properties:
            token:
              type: string
              description: 生成的 API 令牌。
    """
    try:
        # 验证管理员 API 密钥
        admin_api_key = request.headers.get("Admin-API-Key")
        expected_admin_key = os.environ.get("ADMIN_API_KEY")

        if not admin_api_key or not expected_admin_key or admin_api_key != expected_admin_key:
            return get_json_result(data=False, code=settings.RetCode.AUTHENTICATION_ERROR, message="Invalid admin API key!")

        if not request.json:
            return get_json_result(data=False, code=settings.RetCode.ARGUMENT_ERROR, message="Invalid request body!")

        email = request.json.get("email", "")
        if not email:
            return get_json_result(data=False, code=settings.RetCode.ARGUMENT_ERROR, message="Email is required!")

        # 查找用户
        users = UserService.query(email=email)
        if not users:
            return get_json_result(data=False, code=settings.RetCode.AUTHENTICATION_ERROR, message="User not found!")

        user = users[0]
        if hasattr(user, "is_active") and user.is_active == "0":
            return get_json_result(data=False, code=settings.RetCode.AUTHENTICATION_ERROR, message="User account is disabled!")

        # 获取用户租户信息
        tenants = UserTenantService.query(user_id=user.id)
        if not tenants:
            return get_data_error_result(message="Tenant not found!")

        tenant_id = [tenant for tenant in tenants if tenant.role == "owner"][0].tenant_id

        # 生成新的 API 令牌
        obj = {
            "tenant_id": tenant_id,
            "token": generate_confirmation_token(tenant_id),
            "beta": generate_confirmation_token(generate_confirmation_token(tenant_id)).replace("ragflow-", "")[:32],
            "create_time": current_timestamp(),
            "create_date": datetime_format(datetime.now()),
            "update_time": None,
            "update_date": None,
        }

        # 保存到数据库
        if not APITokenService.save(**obj):
            return get_data_error_result(message="Failed to create API token!")

        # 只返回令牌信息，不返回敏感信息
        return get_json_result(data={"token": obj["token"], "beta": obj["beta"], "create_time": obj["create_date"], "user_email": email})
    except Exception as e:
        logging.exception(e)
        return server_error_response(e)


@manager.route("/get_user_tokens", methods=["POST"])  # noqa: F821
def get_user_tokens():
    """
    使用预先配置的管理员密钥获取用户的所有 API 令牌
    ---
    tags:
      - API Tokens
    parameters:
      - in: header
        name: Admin-API-Key
        type: string
        required: true
        description: 管理员 API 密钥。
      - in: body
        name: body
        description: 用户邮箱。
        required: true
        schema:
          type: object
          properties:
            email:
              type: string
              description: 用户邮箱。
    responses:
      200:
        description: 令牌获取成功。
        schema:
          type: object
          properties:
            tokens:
              type: array
              items:
                type: object
                properties:
                  token:
                    type: string
                    description: API 令牌。
                  beta:
                    type: string
                    description: Beta 令牌。
                  create_time:
                    type: string
                    description: 创建时间。
    """
    try:
        # 验证管理员 API 密钥
        admin_api_key = request.headers.get("Admin-API-Key")
        expected_admin_key = os.environ.get("ADMIN_API_KEY")

        if not admin_api_key or not expected_admin_key or admin_api_key != expected_admin_key:
            return get_json_result(data=False, code=settings.RetCode.AUTHENTICATION_ERROR, message="Invalid admin API key!")

        if not request.json:
            return get_json_result(data=False, code=settings.RetCode.ARGUMENT_ERROR, message="Invalid request body!")

        email = request.json.get("email", "")
        if not email:
            return get_json_result(data=False, code=settings.RetCode.ARGUMENT_ERROR, message="Email is required!")

        # 查找用户
        users = UserService.query(email=email)
        if not users:
            return get_json_result(data=False, code=settings.RetCode.AUTHENTICATION_ERROR, message="User not found!")

        user = users[0]
        if hasattr(user, "is_active") and user.is_active == "0":
            return get_json_result(data=False, code=settings.RetCode.AUTHENTICATION_ERROR, message="User account is disabled!")

        # 获取用户租户信息
        tenants = UserTenantService.query(user_id=user.id)
        if not tenants:
            return get_data_error_result(message="Tenant not found!")

        tenant_id = [tenant for tenant in tenants if tenant.role == "owner"][0].tenant_id

        # 获取用户的 API 令牌
        tokens = APITokenService.query(tenant_id=tenant_id)
        token_list = []
        for token in tokens:
            token_dict = token.to_dict()
            # 只返回必要信息，不返回敏感信息
            token_list.append({"token": token_dict["token"], "beta": token_dict["beta"], "create_time": token_dict["create_date"], "create_timestamp": token_dict["create_time"]})

        return get_json_result(data={"tokens": token_list, "user_email": email, "count": len(token_list)})
    except Exception as e:
        logging.exception(e)
        return server_error_response(e)
