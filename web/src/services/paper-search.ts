/**
 * Paper Search API 服务
 */

import request from '@/utils/request';
import {
  PaperSearchParams,
  PaperSearchResponse,
  PaperSurveyParams,
  PaperSurveyResponse,
  PaperSurveyProgressResponse,
  SearchHistoryResponse,
  SurveyHistoryResponse,
  KeywordGroup,
} from '@/interfaces/paper-search';

const API_BASE = '/v1/paper_search';

// 定义提取关键词的参数类型
interface ExtractKeywordsParams {
  query: string;
  keywords_num?: number;
  query_num?: number;
}

// 定义提取关键词的响应类型
interface ExtractKeywordsResponse {
  code: number;
  message: string;
  data: {
    keywords: KeywordGroup;
  };
}

/**
 * 文献检索
 */
export async function searchPapers(params: PaperSearchParams): Promise<PaperSearchResponse> {
  const { response, data } = await request.post(`${API_BASE}/paper_search`, { data: params });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  if (data.code !== 0) {
    throw new Error(data.message || '搜索失败');
  }

  return data;
}

/**
 * 生成文献综述（异步任务）
 */
export async function generateSurvey(params: PaperSurveyParams): Promise<PaperSurveyResponse> {
  const { response, data } = await request.post(`${API_BASE}/paper_survey`, { data: params });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  if (data.code !== 0) {
    throw new Error(data.message || '综述生成失败');
  }

  return data;
}

/**
 * 查询综述生成进度
 */
export async function getSurveyProgress(surveyId: string): Promise<PaperSurveyProgressResponse> {
  const { response, data } = await request.get(`${API_BASE}/paper_survey/${surveyId}/progress`);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  if (data.code !== 0) {
    throw new Error(data.message || '获取进度失败');
  }

  return data;
}

/**
 * 取消综述生成任务
 */
export async function cancelSurvey(surveyId: string): Promise<void> {
  const { response, data } = await request.post(`${API_BASE}/paper_survey/${surveyId}/cancel`, { data: {} });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  if (data.code !== 0) {
    throw new Error(data.message || '取消失败');
  }
}

/**
 * 下载综述文档
 */
export async function downloadSurveyDoc(surveyId: string, format: string = 'docx'): Promise<Blob> {
  try {
    const response = await request.post(`${API_BASE}/paper_survey_doc`, {
      data: {
        survey_id: surveyId,
        format: format,
      },
      responseType: 'blob',
    });

    console.log('Download response:', response);
    console.log('Response type:', typeof response);
    console.log('Response constructor:', response?.constructor?.name);
    console.log('Has blob method:', typeof response?.blob);
    console.log('Is Blob:', response instanceof Blob);
    console.log('Response keys:', Object.keys(response || {}));

    // 当 responseType 为 'blob' 时,request 可能直接返回 Response 对象
    // 检查是否是标准的 Response 对象
    if (response && typeof response.blob === 'function') {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.blob();
    }

    // 如果不是 Response 对象,可能已经是 Blob
    if (response instanceof Blob) {
      return response;
    }

    // 检查是否是 umi-request 的包装格式 { response, data }
    if (response && response.response && response.data) {
      console.log('Found wrapped response format');
      if (response.data instanceof Blob) {
        return response.data;
      }
      if (typeof response.response.blob === 'function') {
        return await response.response.blob();
      }
    }

    throw new Error('Invalid response format');
  } catch (error: any) {
    console.error('Download error:', error);
    throw new Error(error.message || '下载失败');
  }
}

/**
 * 获取搜索历史
 */
export async function getSearchHistory(page: number = 1, pageSize: number = 10, keyword: string = ''): Promise<SearchHistoryResponse> {
  const params: any = {
    page: page.toString(),
    page_size: pageSize.toString(),
  };

  if (keyword) {
    params.keyword = keyword;
  }

  const { response, data } = await request.get(`${API_BASE}/search_history`, { params });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  if (data.code !== 0) {
    throw new Error(data.message || '获取搜索历史失败');
  }

  return data;
}

/**
 * 获取综述历史
 */
export async function getSurveyHistory(page: number = 1, pageSize: number = 10, keyword: string = ''): Promise<SurveyHistoryResponse> {
  const params: any = {
    page: page.toString(),
    page_size: pageSize.toString(),
  };

  if (keyword) {
    params.keyword = keyword;
  }

  const { response, data } = await request.get(`${API_BASE}/survey_history`, { params });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  if (data.code !== 0) {
    throw new Error(data.message || '获取综述历史失败');
  }

  return data;
}

/**
 * 删除综述记录
 */
export async function deleteSurveyRecord(surveyId: string): Promise<void> {
  const { response, data } = await request.delete(`${API_BASE}/paper_survey_record/${surveyId}`);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  if (data.code !== 0) {
    throw new Error(data.message || '删除失败');
  }
}

/**\n * 提取关键词\n */
export async function extractKeywords(params: ExtractKeywordsParams): Promise<ExtractKeywordsResponse> {
  const { response, data } = await request.post(`${API_BASE}/extract_keywords`, { data: params });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  if (data.code !== 0) {
    throw new Error(data.message || '关键词提取失败');
  }

  return data;
}

// 定义使用关键词进行检索的参数类型
interface SearchPapersWithKeywordsParams {
  query: string;
  keywords: KeywordGroup;
  selected_keyword_indices: Array<{type: string, index: number, selected: boolean}>;
  use_fuzzy?: boolean;
}

// 定义使用关键词进行检索的响应类型
interface SearchPapersWithKeywordsResponse {
  code: number;
  message: string;
  data: {
    search_record_id: string;
    papers: any[];
    query: string;
    keywords: any;
  };
}

/**\n * 使用已确认的关键词进行文献检索\n */
export async function searchPapersWithKeywords(params: SearchPapersWithKeywordsParams): Promise<SearchPapersWithKeywordsResponse> {
  const { response, data } = await request.post(`${API_BASE}/paper_search_with_keywords`, { data: params });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  if (data.code !== 0) {
    throw new Error(data.message || '使用关键词搜索失败');
  }

  return data;
}
