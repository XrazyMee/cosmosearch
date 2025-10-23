#
#  Copyright 2025 The InfiniFlow Authors. All Rights Reserved.
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
#  limitations under the License.
#

from flask import request
from flask_login import login_required, current_user
import logging

from api.db.services import PaperSearchService
from api.db.services.user_service import TenantService, UserTenantService
from api.utils import get_uuid
from api.utils.api_utils import get_data_error_result, get_json_result, server_error_response, validate_request
from api.db.db_models import PaperSearchRecord, PaperSurveyRecord

logger = logging.getLogger(__name__)


@manager.route("/extract_keywords", methods=["POST"])  # noqa: F821
@login_required
@validate_request("query")
def extract_keywords():
    """提取关键词功能"""
    req = request.json
    query = req.get("query", "")
    keywords_num = req.get("keywords_num", 5)
    query_num = req.get("query_num", 5)

    try:
        # 获取用户关联的租户ID
        user_tenants = TenantService.get_info_by(current_user.id)
        if not user_tenants:
            user_tenants = UserTenantService.get_tenants_by_user_id(current_user.id)
            if not user_tenants:
                return get_data_error_result(message="用户未关联任何租户")
            tenant_id = user_tenants[0]["tenant_id"]
        else:
            tenant_id = user_tenants[0]["tenant_id"]

        # 提取关键词
        result = PaperSearchService.extract_keywords(question=query, tenant_id=tenant_id, keywords_num=keywords_num, query_num=query_num)

        return get_json_result(data={"keywords": result})
    except Exception as e:
        return server_error_response(e)


@manager.route("/paper_search_with_keywords", methods=["POST"])  # noqa: F821
@login_required
@validate_request("query", "keywords", "selected_keyword_indices")  # 需要关键词和选中的索引
def paper_search_with_keywords():
    """论文检索功能 - 使用用户确认的关键词"""
    req = request.json
    query = req.get("query", "")
    all_keywords = req.get("keywords", {})  # 提取的所有关键词
    selected_keyword_indices = req.get("selected_keyword_indices", [])  # 用户选择的关键词索引
    use_fuzzy = req.get("use_fuzzy", True)

    try:
        # 获取用户关联的租户ID
        user_tenants = TenantService.get_info_by(current_user.id)
        if not user_tenants:
            user_tenants = UserTenantService.get_tenants_by_user_id(current_user.id)
            if not user_tenants:
                return get_data_error_result(message="用户未关联任何租户")
            tenant_id = user_tenants[0]["tenant_id"]
        else:
            tenant_id = user_tenants[0]["tenant_id"]

        # 创建检索记录
        search_record = {
            "id": get_uuid(),
            "tenant_id": tenant_id,
            "user_id": current_user.id,
            "query": query,
            "keywords": "{}",  # 将在服务中更新
            "search_results": "[]",  # 将在服务中更新
            "result_count": 0,  # 将在服务中更新
        }

        # 基于用户选择的关键词构建搜索查询
        search_query_parts = []

        # 从选中的索引中提取关键词
        for selected in selected_keyword_indices:
            if selected.get("selected"):
                category = selected.get("type")
                index = selected.get("index")
                if category in all_keywords and index < len(all_keywords[category]):
                    search_query_parts.append(all_keywords[category][index])

        final_search_query = " ".join(search_query_parts)

        # 执行检索 - 使用已提取的关键词进行搜索
        result = PaperSearchService.search_papers_with_keywords(search_record_id=search_record["id"], query=query, search_query=final_search_query, tenant_id=tenant_id, use_fuzzy=use_fuzzy)

        return get_json_result(data=result)
    except Exception as e:
        return server_error_response(e)


@manager.route("/paper_search", methods=["POST"])  # noqa: F821
@login_required
@validate_request("query")
def paper_search():
    """论文检索功能"""
    req = request.json
    query = req.get("query", "")
    keywords_num = req.get("keywords_num", 5)
    query_num = req.get("query_num", 5)
    use_fuzzy = req.get("use_fuzzy", True)

    try:
        # 获取用户关联的租户ID (获取用户拥有的租户，通常是所有者角色)
        user_tenants = TenantService.get_info_by(current_user.id)
        if not user_tenants:
            # 如果用户没有所有者角色的租户，尝试获取其他角色的租户
            user_tenants = UserTenantService.get_tenants_by_user_id(current_user.id)
            if not user_tenants:
                return get_data_error_result(message="用户未关联任何租户")
            tenant_id = user_tenants[0]["tenant_id"]
        else:
            tenant_id = user_tenants[0]["tenant_id"]

        # 创建检索记录
        search_record = {
            "id": get_uuid(),
            "tenant_id": tenant_id,
            "user_id": current_user.id,
            "query": query,
            "keywords": "{}",  # 将在服务中更新
            "search_results": "[]",  # 将在服务中更新
            "result_count": 0,  # 将在服务中更新
        }

        # 执行检索
        result = PaperSearchService.search_papers(
            search_record_id=search_record["id"],
            query=query,
            tenant_id=tenant_id,  # Pass tenant_id
            keywords_num=keywords_num,
            query_num=query_num,
            use_fuzzy=use_fuzzy,
        )

        return get_json_result(data=result)
    except Exception as e:
        return server_error_response(e)


@manager.route("/paper_survey", methods=["POST"])  # noqa: F821
@login_required
@validate_request("search_record_id", "papers")
def paper_survey():
    """论文综述生成功能（异步）"""
    req = request.json
    search_record_id = req.get("search_record_id", "")
    papers = req.get("papers", [])
    title = req.get("title", "文献综述")

    try:
        # 获取用户关联的租户ID
        user_tenants = TenantService.get_info_by(current_user.id)
        if not user_tenants:
            user_tenants = UserTenantService.get_tenants_by_user_id(current_user.id)
            if not user_tenants:
                return get_data_error_result(message="用户未关联任何租户")
            tenant_id = user_tenants[0]["tenant_id"]
        else:
            tenant_id = user_tenants[0]["tenant_id"]

        # 创建综述记录
        survey_record = {
            "id": get_uuid(),
            "tenant_id": tenant_id,
            "user_id": current_user.id,
            "search_record_id": search_record_id,
            "survey_content": "",
            "survey_title": title,
            "status": "pending",
            "progress": 0.0,
            "progress_msg": "等待处理",
        }

        # 保存到数据库
        PaperSurveyRecord.create(**survey_record)

        # 将任务加入队列（异步处理）
        task_id = PaperSearchService.queue_survey_task(survey_record=survey_record, papers=papers, priority=0)

        # 立即返回（不等待完成）
        return get_json_result(data={"survey_id": survey_record["id"], "task_id": task_id, "status": "pending", "progress": 0.0, "message": "综述生成任务已提交，正在处理中"})

    except Exception as e:
        return server_error_response(e)


@manager.route("/paper_survey/<survey_id>", methods=["GET"])  # noqa: F821
@login_required
def get_survey(survey_id):
    """获取综述详情"""
    try:
        result = PaperSearchService.get_survey(survey_id)
        if result:
            return get_json_result(data=result)
        else:
            return get_data_error_result(message="综述不存在或无权限访问")
    except Exception as e:
        return server_error_response(e)


@manager.route("/paper_survey/<survey_id>/progress", methods=["GET"])  # noqa: F821
@login_required
def get_survey_progress(survey_id):
    """获取综述生成进度"""
    try:
        # 查询综述记录
        survey = PaperSurveyRecord.get((PaperSurveyRecord.id == survey_id) & (PaperSurveyRecord.user_id == current_user.id))

        # 构造进度响应
        progress_data = {
            "survey_id": survey.id,
            "status": survey.status,
            "progress": survey.progress,
            "progress_msg": survey.progress_msg,
            "survey_title": survey.survey_title,
            "process_duration": survey.process_duration,
            "created_at": survey.created_at,
            "updated_at": survey.updated_at,
        }

        # 如果已完成，返回内容和文献列表
        if survey.status == "completed":
            progress_data["survey_content"] = survey.survey_content

            # 获取文献列表 - 优先从 survey_papers 字段获取
            try:
                import json

                if survey.survey_papers:
                    # 优先使用综述记录中保存的文献列表
                    papers = json.loads(survey.survey_papers)
                    logger.info(f"从survey_papers字段获取文献列表,共{len(papers)}篇")
                else:
                    # 兼容旧数据,尝试从搜索记录获取
                    search_record = PaperSearchRecord.get_or_none(PaperSearchRecord.id == survey.search_record_id)
                    if search_record and search_record.search_results:
                        papers = json.loads(search_record.search_results)
                        logger.info(f"从search_record获取文献列表,共{len(papers)}篇")
                    else:
                        papers = []
                        logger.warning(f"无法获取文献列表: survey_id={survey.id}")

                progress_data["papers"] = papers
            except Exception as e:
                logger.error(f"获取文献列表失败: {e}")
                progress_data["papers"] = []

        return get_json_result(data=progress_data)

    except PaperSurveyRecord.DoesNotExist:
        return get_data_error_result(message="综述不存在或无权限访问")
    except Exception as e:
        return server_error_response(e)


@manager.route("/paper_survey/<survey_id>/cancel", methods=["POST"])  # noqa: F821
@login_required
def cancel_survey(survey_id):
    """取消综述生成任务"""
    try:
        # 查询综述记录
        survey = PaperSurveyRecord.get((PaperSurveyRecord.id == survey_id) & (PaperSurveyRecord.user_id == current_user.id))

        # 只能取消 pending 或 processing 状态的任务
        if survey.status not in ["pending", "processing"]:
            return get_data_error_result(message=f"任务状态为 {survey.status}，无法取消")

        # 取消关联的 Task
        if survey.task_id:
            from api.db.services.task_service import TaskService

            TaskService.update_progress(survey.task_id, {"progress": -1, "progress_msg": "任务已取消"})

        # 更新综述状态
        from api.utils import current_timestamp

        PaperSurveyRecord.update(status="cancelled", progress=-1, progress_msg="任务已取消", updated_at=current_timestamp()).where(PaperSurveyRecord.id == survey_id).execute()

        return get_json_result(data={"message": "任务已取消"})

    except PaperSurveyRecord.DoesNotExist:
        return get_data_error_result(message="综述不存在或无权限访问")
    except Exception as e:
        return server_error_response(e)


@manager.route("/paper_survey_doc", methods=["POST"])  # noqa: F821
@login_required
@validate_request("survey_id")
def paper_survey_doc():
    """下载综述文档"""
    req = request.json
    survey_id = req.get("survey_id", "")

    try:
        # 获取用户关联的租户ID
        user_tenants = TenantService.get_info_by(current_user.id)
        if not user_tenants:
            user_tenants = UserTenantService.get_tenants_by_user_id(current_user.id)
            if not user_tenants:
                return get_data_error_result(message="用户未关联任何租户")
            tenant_id = user_tenants[0]["tenant_id"]
        else:
            tenant_id = user_tenants[0]["tenant_id"]
        download_record = {"id": get_uuid(), "tenant_id": tenant_id, "user_id": current_user.id, "survey_record_id": survey_id, "download_format": req.get("format", "docx")}

        # 生成文档
        result = PaperSearchService.generate_survey_doc(download_record=download_record)

        return result
    except Exception as e:
        return server_error_response(e)


@manager.route("/search_history", methods=["GET"])  # noqa: F821
@login_required
def get_search_history():
    """获取检索历史"""
    try:
        # 获取用户关联的租户ID
        user_tenants = TenantService.get_info_by(current_user.id)
        if not user_tenants:
            user_tenants = UserTenantService.get_tenants_by_user_id(current_user.id)
            if not user_tenants:
                return get_data_error_result(message="用户未关联任何租户")
            tenant_id = user_tenants[0]["tenant_id"]
        else:
            tenant_id = user_tenants[0]["tenant_id"]

        page = int(request.args.get("page", 1))
        page_size = int(request.args.get("page_size", 10))
        keyword = request.args.get("keyword", "")

        result = PaperSearchService.get_search_history(user_id=current_user.id, tenant_id=tenant_id, page=page, page_size=page_size, keyword=keyword)

        return get_json_result(data=result)
    except Exception as e:
        return server_error_response(e)


@manager.route("/survey_history", methods=["GET"])  # noqa: F821
@login_required
def get_survey_history():
    """获取综述历史"""
    try:
        # 获取用户关联的租户ID
        user_tenants = TenantService.get_info_by(current_user.id)
        if not user_tenants:
            user_tenants = UserTenantService.get_tenants_by_user_id(current_user.id)
            if not user_tenants:
                return get_data_error_result(message="用户未关联任何租户")
            tenant_id = user_tenants[0]["tenant_id"]
        else:
            tenant_id = user_tenants[0]["tenant_id"]

        page = int(request.args.get("page", 1))
        page_size = int(request.args.get("page_size", 10))
        keyword = request.args.get("keyword", "")

        result = PaperSearchService.get_survey_history(user_id=current_user.id, tenant_id=tenant_id, page=page, page_size=page_size, keyword=keyword)

        return get_json_result(data=result)
    except Exception as e:
        return server_error_response(e)


@manager.route("/paper_survey_record/<survey_id>", methods=["DELETE"])  # noqa: F821
@login_required
def delete_survey_record(survey_id):
    """删除综述记录"""
    try:
        # 获取用户关联的租户ID
        user_tenants = TenantService.get_info_by(current_user.id)
        if not user_tenants:
            user_tenants = UserTenantService.get_tenants_by_user_id(current_user.id)
            if not user_tenants:
                return get_data_error_result(message="用户未关联任何租户")
            tenant_id = user_tenants[0]["tenant_id"]
        else:
            tenant_id = user_tenants[0]["tenant_id"]

        result = PaperSearchService.delete_survey_record(survey_id=survey_id, user_id=current_user.id, tenant_id=tenant_id)

        if result:
            return get_json_result(data=True)
        else:
            return get_data_error_result(message="删除失败或无权限删除")
    except Exception as e:
        return server_error_response(e)
