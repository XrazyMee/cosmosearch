// Paper Search 相关类型定义

export interface Paper {
  uid: string; // 后端返回的唯一ID
  title: string;
  abstract: string;
  source: string;
  selected: boolean;
  similarity: number; // 相似度
  doc_id: string; // 文档ID
  kb_id: string; // 知识库ID
  authors?: string[]; // 可能存在，但后端不一定提供
  publish_time?: string; // 可能存在，但后端不一定提供
  doi?: string;
  citations?: number;
  keywords?: string[];
  url?: string;
}

export interface KeywordGroup {
  keyword_en: string[];
  keyword_cn: string[];
  searchquery_en: string[];
  searchquery_cn: string[];
  time_range: string[];
}

export interface PaperSearchParams {
  query: string;
  keywords_num?: number;
  query_num?: number;
  use_fuzzy?: boolean;
}

export interface PaperSurveyParams {
  papers: Paper[];
  title: string;
  search_record_id: string;
}

export interface PaperSearchResponse {
  code: number;
  data: {
    search_record_id: string;
    papers: Paper[];
    keywords: KeywordGroup;
  };
}

export interface PaperSurveyResponse {
  code: number;
  data: {
    survey_id: string;
    task_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    progress: number;
    message: string;
  };
}

export interface PaperSurveyProgressResponse {
  code: number;
  data: {
    survey_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    progress: number;
    progress_msg: string;
    survey_title: string;
    survey_content?: string;
    papers?: Paper[];  // 文献列表（仅在完成时返回）
    process_duration: number;
    created_at: number;
    updated_at: number;
  };
}

export interface PaperSurveyDetailResponse {
  code: number;
  data: {
    id: string;
    tenant_id: string;
    user_id: string;
    search_record_id: string;
    survey_content: string;
    survey_title: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    created_at: number;
  };
}

export interface SearchHistoryRecord {
  id: string;
  query: string;
  result_count: number;
  created_at: string;
  // 添加综述相关信息
  survey_status?: string;  // 综述生成状态
  survey_id?: string;      // 综述ID（如果有）
}

export interface SurveyHistoryRecord {
  id: string;
  search_record_id: string;
  survey_title: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
}

export interface SearchHistoryResponse {
  code: number;
  data: {
    total: number;
    records: SearchHistoryRecord[];
  };
}

export interface SurveyHistoryResponse {
  code: number;
  data: {
    total: number;
    records: SurveyHistoryRecord[];
  };
}
