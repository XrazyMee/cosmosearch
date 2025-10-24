import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/input';
import {
  KeywordGroup,
  Paper,
  PaperSurveyParams,
} from '@/interfaces/paper-search';
import {
  extractKeywords,
  generateSurvey,
  searchPapersWithKeywords,
} from '@/services/paper-search';
import { Layout, Typography, message } from 'antd';
import { Search } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import KeywordReview from './components/keyword-review';
import LiteratureList from './components/literature-list';
import SearchHistorySidebar from './components/search-history-sidebar';
import SurveyResult from './components/survey-result';
import './index.css';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

const PaperSearchPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchStep, setSearchStep] = useState<
    'search' | 'keywords' | 'literature' | 'survey'
  >('search');
  const [keywords, setKeywords] = useState<KeywordGroup>({
    keyword_en: [],
    keyword_cn: [],
    searchquery_en: [],
    searchquery_cn: [],
    time_range: [],
  });
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(
    new Set(),
  );
  const [literatureList, setLiteratureList] = useState<Paper[]>([]);
  const [selectedPapers, setSelectedPapers] = useState<Set<string>>(new Set());
  const [surveyResult, setSurveyResult] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchRecordId, setSearchRecordId] = useState<string>(''); // 保存搜索记录ID
  const [customKeywords, setCustomKeywords] = useState<string[]>([]); // 自定义关键词

  const handleSearch = async (value: string) => {
    setLoading(true);
    try {
      // 调用后端API仅进行关键词提取
      const params = {
        query: value,
        keywords_num: 5,
        query_num: 5,
      };

      const data = await extractKeywords(params);

      // 设置关键词，但不设置文献列表（文献检索将在用户确认关键词后进行）
      setKeywords(data.data.keywords);

      // 自动选中所有提取的关键词
      const allKeywordKeys = new Set<string>();
      data.data.keywords.keyword_en.forEach((_, idx) =>
        allKeywordKeys.add(`keyword_en_${idx}`),
      );
      data.data.keywords.keyword_cn.forEach((_, idx) =>
        allKeywordKeys.add(`keyword_cn_${idx}`),
      );
      data.data.keywords.searchquery_en.forEach((_, idx) =>
        allKeywordKeys.add(`searchquery_en_${idx}`),
      );
      data.data.keywords.searchquery_cn.forEach((_, idx) =>
        allKeywordKeys.add(`searchquery_cn_${idx}`),
      );

      // 自动选中所有自定义关键词
      customKeywords.forEach((_, idx) => allKeywordKeys.add(`custom_${idx}`));

      setSelectedKeywords(allKeywordKeys);

      setSearchQuery(value); // 保存查询内容
      setSearchStep('keywords'); // 跳转到关键词审核步骤
      message.success(`Keywords extracted. Please select relevant keywords`);
    } catch (error: any) {
      message.error('搜索失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeywordConfirm = async () => {
    setLoading(true);
    try {
      // 获取用户选中的关键词索引
      const selectedIndices: Array<{
        type: string;
        index: number;
        selected: boolean;
      }> = [];

      // 处理英文关键词
      keywords.keyword_en.forEach((_, idx) => {
        if (selectedKeywords.has(`keyword_en_${idx}`)) {
          selectedIndices.push({
            type: 'keyword_en',
            index: idx,
            selected: true,
          });
        }
      });

      // 处理中文关键词
      keywords.keyword_cn.forEach((_, idx) => {
        if (selectedKeywords.has(`keyword_cn_${idx}`)) {
          selectedIndices.push({
            type: 'keyword_cn',
            index: idx,
            selected: true,
          });
        }
      });

      // 处理英文搜索句
      keywords.searchquery_en.forEach((_, idx) => {
        if (selectedKeywords.has(`searchquery_en_${idx}`)) {
          selectedIndices.push({
            type: 'searchquery_en',
            index: idx,
            selected: true,
          });
        }
      });

      // 处理中文搜索句
      keywords.searchquery_cn.forEach((_, idx) => {
        if (selectedKeywords.has(`searchquery_cn_${idx}`)) {
          selectedIndices.push({
            type: 'searchquery_cn',
            index: idx,
            selected: true,
          });
        }
      });

      // 处理自定义关键词
      customKeywords.forEach((_, idx) => {
        if (selectedKeywords.has(`custom_${idx}`)) {
          selectedIndices.push({ type: 'custom', index: idx, selected: true });
        }
      });

      // 使用确认的关键词重新进行文献检索
      const params = {
        query: searchQuery,
        keywords: keywords,
        selected_keyword_indices: selectedIndices,
        use_fuzzy: true,
      };

      const data = await searchPapersWithKeywords(params);

      // 更新文献列表
      setLiteratureList(data.data.papers);
      setSearchRecordId(data.data.search_record_id);

      setSearchStep('literature'); // 跳转到文献选择步骤
      message.success(
        `Found ${data.data.papers.length} papers using selected keywords`,
      );
    } catch (error: any) {
      message.error('文献检索失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSurveyGeneration = async () => {
    setLoading(true);
    try {
      // 获取选中的论文
      const selectedPapersData = literatureList.filter((paper, idx) =>
        selectedPapers.has(idx.toString()),
      );

      if (selectedPapersData.length === 0) {
        message.warning('Please select at least one paper');
        setLoading(false);
        return;
      }

      if (!searchRecordId) {
        message.error('Search record ID not found');
        setLoading(false);
        return;
      }

      const params: PaperSurveyParams = {
        papers: selectedPapersData,
        title: '文献综述',
        search_record_id: searchRecordId,
      };

      // 调用后端API生成综述（异步任务）
      const data = await generateSurvey(params);

      // 设置综述结果（包含survey_id用于轮询）
      setSurveyResult({
        survey_id: data.data.survey_id,
        task_id: data.data.task_id,
        status: data.data.status,
      });

      setSearchStep('survey'); // 跳转到综述展示步骤
      message.success(
        `Survey generation task submitted. Selected ${selectedPapersData.length} papers`,
      );
    } catch (error: any) {
      message.error('综述生成失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleKeyword = (type: string, index: number) => {
    const key = `${type}_${index}`;
    const newSelected = new Set(selectedKeywords);

    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }

    setSelectedKeywords(newSelected);
  };

  // 处理自定义关键词的切换
  const toggleCustomKeyword = (type: string, index: number) => {
    const key = `custom_${index}`;
    const newSelected = new Set(selectedKeywords);

    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }

    setSelectedKeywords(newSelected);
  };

  // 添加自定义关键词
  const handleAddCustomKeyword = (keyword: string) => {
    setCustomKeywords([...customKeywords, keyword]);

    // 自动选中新添加的关键词
    const newSelected = new Set(selectedKeywords);
    newSelected.add(`custom_${customKeywords.length}`);
    setSelectedKeywords(newSelected);
  };

  // 移除自定义关键词
  const handleRemoveCustomKeyword = (index: number) => {
    const newCustomKeywords = [...customKeywords];
    newCustomKeywords.splice(index, 1);
    setCustomKeywords(newCustomKeywords);

    // 如果该关键词被选中，则从选中状态中移除
    const key = `custom_${index}`;
    const newSelected = new Set(selectedKeywords);

    // 更新所有后续自定义关键词的索引
    for (let i = index; i < customKeywords.length; i++) {
      const oldKey = `custom_${i + 1}`;
      const newKey = `custom_${i}`;
      if (newSelected.has(oldKey)) {
        newSelected.delete(oldKey);
        newSelected.add(newKey);
      }
    }

    if (newSelected.has(key)) {
      newSelected.delete(key);
    }

    setSelectedKeywords(newSelected);
  };

  const togglePaper = (index: number) => {
    const newSelected = new Set(selectedPapers);

    const indexStr = index.toString();
    if (newSelected.has(indexStr)) {
      newSelected.delete(indexStr);
    } else {
      newSelected.add(indexStr);
    }

    setSelectedPapers(newSelected);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header className="bg-white px-8 py-4 shadow-sm">
        <div className="flex justify-between mb-5 items-center">
          <div className="text-2xl font-semibold flex items-center gap-2.5">
            <span className="size-6"></span>
            {t('header.literatureSearch') ||
              t('paperSearch.title') ||
              'Literature Search'}
          </div>
          <Button onClick={() => setSearchStep('search')}>
            <Search className="size-2.5 mr-1" />
            {t('paperSearch.newSearch') || 'New Search'}
          </Button>
        </div>
      </Header>

      <Layout>
        <Sider width={300} className="bg-white p-6 border-r">
          <SearchHistorySidebar
            onHistoryClick={(surveyId) => {
              // 处理综述历史点击事件 - 直接跳转到综述结果页面
              setSurveyResult({
                survey_id: surveyId,
              });
              setSearchStep('survey');
              message.info('Loading survey...');
            }}
          />
        </Sider>

        <Layout className="bg-gray-50">
          <Content className="p-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              {searchStep === 'search' && (
                <div className="text-center py-10">
                  <Typography.Title level={2}>
                    {t('header.literatureSearch') || 'Literature Search'}
                  </Typography.Title>
                  <Typography.Text
                    type="secondary"
                    className="text-base mb-8 block"
                  >
                    {t('paperSearch.description') ||
                      'Search literature and generate survey'}
                  </Typography.Text>

                  <div className="max-w-4xl mx-auto">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-full max-w-2xl">
                        <SearchInput
                          placeholder={
                            t('paperSearch.searchPlaceholder') ||
                            t('knowledgeList.searchKnowledgePlaceholder') ||
                            'Enter research topic or keywords...'
                          }
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full h-14 text-lg"
                        />
                      </div>
                      <Button
                        onClick={() => handleSearch(searchQuery)}
                        disabled={!searchQuery.trim()}
                        loading={loading}
                        className="px-8 py-6 text-lg"
                      >
                        <Search className="size-4 mr-2" />
                        检索
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {searchStep === 'keywords' && (
                <KeywordReview
                  keywords={keywords}
                  selectedKeywords={selectedKeywords}
                  toggleKeyword={toggleKeyword}
                  onConfirm={handleKeywordConfirm}
                  loading={loading}
                  onAddCustomKeyword={handleAddCustomKeyword}
                  customKeywords={customKeywords}
                  onRemoveCustomKeyword={handleRemoveCustomKeyword}
                  toggleCustomKeyword={toggleCustomKeyword}
                />
              )}

              {searchStep === 'literature' && (
                <LiteratureList
                  literatureList={literatureList}
                  selectedPapers={selectedPapers}
                  togglePaper={togglePaper}
                  onGenerateSurvey={handleSurveyGeneration}
                  loading={loading}
                  onSelectAll={() => {
                    const allIndices = literatureList.map((_, idx) =>
                      idx.toString(),
                    );
                    setSelectedPapers(new Set(allIndices));
                  }}
                  onClearAll={() => {
                    setSelectedPapers(new Set());
                  }}
                />
              )}

              {searchStep === 'survey' && (
                <SurveyResult
                  surveyResult={surveyResult}
                  surveyId={surveyResult?.survey_id}
                  onNewSearch={() => {
                    setSearchStep('search');
                    setSearchQuery('');
                    setKeywords({
                      keyword_en: [],
                      keyword_cn: [],
                      searchquery_en: [],
                      searchquery_cn: [],
                      time_range: [],
                    });
                    setSelectedKeywords(new Set());
                    setLiteratureList([]);
                    setSelectedPapers(new Set());
                    setSurveyResult(null);
                    setSearchRecordId('');
                    setCustomKeywords([]); // 清空自定义关键词
                  }}
                />
              )}
            </div>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default PaperSearchPage;
