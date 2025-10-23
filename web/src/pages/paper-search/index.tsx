import React, { useState } from 'react';
import { Layout, Input, Button, Typography, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import SearchHistorySidebar from './components/search-history-sidebar';
import KeywordReview from './components/keyword-review';
import LiteratureList from './components/literature-list';
import SurveyResult from './components/survey-result';
import {
  KeywordGroup,
  Paper,
  PaperSearchParams,
  PaperSurveyParams,
} from '@/interfaces/paper-search';
import { searchPapers, generateSurvey, extractKeywords, searchPapersWithKeywords } from '@/services/paper-search';
import './index.css';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;
const { Search } = Input;

const PaperSearchPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchStep, setSearchStep] = useState<'search' | 'keywords' | 'literature' | 'survey'>('search');
  const [keywords, setKeywords] = useState<KeywordGroup>({
    keyword_en: [],
    keyword_cn: [],
    searchquery_en: [],
    searchquery_cn: [],
    time_range: []
  });
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
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
        query_num: 5
      };

      const data = await extractKeywords(params);

      // 设置关键词，但不设置文献列表（文献检索将在用户确认关键词后进行）
      setKeywords(data.data.keywords);

      // 自动选中所有提取的关键词
      const allKeywordKeys = new Set<string>();
      data.data.keywords.keyword_en.forEach((_, idx) => allKeywordKeys.add(`keyword_en_${idx}`));
      data.data.keywords.keyword_cn.forEach((_, idx) => allKeywordKeys.add(`keyword_cn_${idx}`));
      data.data.keywords.searchquery_en.forEach((_, idx) => allKeywordKeys.add(`searchquery_en_${idx}`));
      data.data.keywords.searchquery_cn.forEach((_, idx) => allKeywordKeys.add(`searchquery_cn_${idx}`));

      // 自动选中所有自定义关键词
      customKeywords.forEach((_, idx) => allKeywordKeys.add(`custom_${idx}`));

      setSelectedKeywords(allKeywordKeys);

      setSearchQuery(value); // 保存查询内容
      setSearchStep('keywords'); // 跳转到关键词审核步骤
      message.success(`关键词提取完成，请选择相关关键词`);
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
      const selectedIndices: Array<{type: string, index: number, selected: boolean}> = [];

      // 处理英文关键词
      keywords.keyword_en.forEach((_, idx) => {
        if (selectedKeywords.has(`keyword_en_${idx}`)) {
          selectedIndices.push({type: 'keyword_en', index: idx, selected: true});
        }
      });

      // 处理中文关键词
      keywords.keyword_cn.forEach((_, idx) => {
        if (selectedKeywords.has(`keyword_cn_${idx}`)) {
          selectedIndices.push({type: 'keyword_cn', index: idx, selected: true});
        }
      });

      // 处理英文搜索句
      keywords.searchquery_en.forEach((_, idx) => {
        if (selectedKeywords.has(`searchquery_en_${idx}`)) {
          selectedIndices.push({type: 'searchquery_en', index: idx, selected: true});
        }
      });

      // 处理中文搜索句
      keywords.searchquery_cn.forEach((_, idx) => {
        if (selectedKeywords.has(`searchquery_cn_${idx}`)) {
          selectedIndices.push({type: 'searchquery_cn', index: idx, selected: true});
        }
      });

      // 处理自定义关键词
      customKeywords.forEach((_, idx) => {
        if (selectedKeywords.has(`custom_${idx}`)) {
          selectedIndices.push({type: 'custom', index: idx, selected: true});
        }
      });

      // 使用确认的关键词重新进行文献检索
      const params = {
        query: searchQuery,
        keywords: keywords,
        selected_keyword_indices: selectedIndices,
        use_fuzzy: true
      };

      const data = await searchPapersWithKeywords(params);

      // 更新文献列表
      setLiteratureList(data.data.papers);
      setSearchRecordId(data.data.search_record_id);

      setSearchStep('literature'); // 跳转到文献选择步骤
      message.success(`使用确认的关键词检索到 ${data.data.papers.length} 篇文献`);
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
        selectedPapers.has(idx.toString())
      );

      if (selectedPapersData.length === 0) {
        message.warning('请至少选择一篇文献');
        setLoading(false);
        return;
      }

      if (!searchRecordId) {
        message.error('未找到搜索记录ID');
        setLoading(false);
        return;
      }

      const params: PaperSurveyParams = {
        papers: selectedPapersData,
        title: '文献综述',
        search_record_id: searchRecordId
      };

      // 调用后端API生成综述（异步任务）
      const data = await generateSurvey(params);

      // 设置综述结果（包含survey_id用于轮询）
      setSurveyResult({
        survey_id: data.data.survey_id,
        task_id: data.data.task_id,
        status: data.data.status
      });

      setSearchStep('survey'); // 跳转到综述展示步骤
      message.success(`综述生成任务已提交，共选择 ${selectedPapersData.length} 篇文献`);
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
      <Header className="header" style={{ background: '#fff', padding: '0 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ float: 'left', fontSize: '18px', fontWeight: 'bold', lineHeight: '64px' }}>
          文献检索与综述生成
        </div>
      </Header>

      <Layout>
                <Sider width={300} style={{ background: '#fff', padding: '20px 0' }}>
          <SearchHistorySidebar onHistoryClick={(surveyId) => {
            // 处理综述历史点击事件 - 直接跳转到综述结果页面
            setSurveyResult({
              survey_id: surveyId
            });
            setSearchStep('survey');
            message.info('正在加载综述...');
          }} />
        </Sider>

        <Layout style={{ padding: '24px' }}>
          <Content style={{ background: '#fff', padding: '24px', margin: 0, minHeight: 280, borderRadius: 6 }}>
            {searchStep === 'search' && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Title level={2}>文献检索与综述生成</Title>
                <Text type="secondary" style={{ fontSize: '16px', marginBottom: '30px', display: 'block' }}>
                  输入您的研究主题，我们将帮助您检索相关文献并生成综述
                </Text>

                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                  <Search
                    placeholder="请输入研究主题或关键词..."
                    size="large"
                    enterButton={<Button type="primary" icon={<SearchOutlined />} loading={loading}>检索</Button>}
                    onSearch={handleSearch}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    value={searchQuery}
                    style={{ marginBottom: '20px' }}
                  />
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
                  const allIndices = literatureList.map((_, idx) => idx.toString());
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
                    time_range: []
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
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default PaperSearchPage;
