import { downloadSurveyDoc, getSurveyProgress } from '@/services/paper-search';
import { DownloadOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  message,
  Progress,
  Space,
  Spin,
  Tooltip,
  Typography,
} from 'antd';
import 'katex/dist/katex.min.css';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import './survey-result.css';

const { Title, Text } = Typography;

interface SurveyResultProps {
  surveyResult: any;
  surveyId?: string;
  onNewSearch?: () => void;
}
const SurveyResult: React.FC<SurveyResultProps> = ({
  surveyId,
}: SurveyResultProps) => {
  const [surveyContent, setSurveyContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [status, setStatus] = useState<
    'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  >('pending');
  const [progress, setProgress] = useState<number>(0);
  const { t } = useTranslation();
  const [progressMsg, setProgressMsg] = useState<string>(
    t('paperSearch.waiting'),
  );
  const [hasShownCompleteMessage, setHasShownCompleteMessage] =
    useState<boolean>(false);
  const [papers, setPapers] = useState<any[]>([]);

  // 处理综述内容，提取引用信息
  const { processedContent, citationMap } = useMemo(() => {
    if (!surveyContent) {
      return { processedContent: '', citationMap: {} };
    }

    let refs: Record<string, string> = {};

    // 优先使用从后端返回的文献列表构建引用映射
    if (papers && papers.length > 0) {
      refs = {};
      papers.forEach((paper, index) => {
        refs[index + 1] = paper.title || '未知标题';
      });
    } else {
      // 如果没有文献列表，尝试从综述内容中提取引用编号对应关系
      const refPattern = /##(\d+)\$\$ - (.+?)(?:\n|$)/g;
      let match;
      const tempRefs: Record<string, string> = {};

      let tempContent = surveyContent;
      while ((match = refPattern.exec(tempContent)) !== null) {
        const num = parseInt(match[1]);
        const title = match[2].trim();
        tempRefs[num] = title;
      }

      refs = tempRefs;
    }

    // no-op: refs is returned via citationMap for rendering

    // 移除引用编号对应关系部分（如果存在）
    let content = surveyContent.replace(
      /###引用编号对应关系###[\s\S]*?(?=###|$)/g,
      '',
    );

    // 将 ##数字$$ 格式转换为内联代码格式，标记为 [CITATION:数字]，方便自定义渲染器识别
    content = content.replace(/##(\d+)\$\$/g, '`[CITATION:$1]`');

    return { processedContent: content, citationMap: refs };
  }, [surveyContent, papers]);

  // 当surveyId存在时，开始轮询获取综述进度
  useEffect(() => {
    if (!surveyId) {
      setLoading(false);
      return;
    }

    let timer: NodeJS.Timeout | null = null;
    let isMounted = true;

    // 获取综述进度的函数
    const fetchSurveyProgress = async () => {
      try {
        const data = await getSurveyProgress(surveyId);

        if (!isMounted) return;

        const progressData = data.data;
        setStatus(progressData.status);
        setProgress(progressData.progress * 100);
        setProgressMsg(progressData.progress_msg || '');

        // 检查是否已经完成、失败或取消
        if (progressData.status === 'completed') {
          if (progressData.survey_content) {
            setSurveyContent(progressData.survey_content);
          }

          // 设置文献列表
          if (progressData.papers && progressData.papers.length > 0) {
            setPapers(progressData.papers);
          }

          setLoading(false);

          // 只在第一次完成时显示消息
          if (!hasShownCompleteMessage) {
            message.success(t('paperSearch.surveyCompleted'));
            setHasShownCompleteMessage(true);
          }

          // 清除定时器，停止轮询
          if (timer) {
            clearInterval(timer);
            timer = null;
          }
        } else if (progressData.status === 'failed') {
          setLoading(false);

          if (!hasShownCompleteMessage) {
            message.error(
              t('paperSearch.surveyFailed') + ': ' + progressData.progress_msg,
            );
            setHasShownCompleteMessage(true);
          }

          if (timer) {
            clearInterval(timer);
            timer = null;
          }
        } else if (progressData.status === 'cancelled') {
          setLoading(false);

          if (!hasShownCompleteMessage) {
            message.warning(t('paperSearch.surveyCancelled'));
            setHasShownCompleteMessage(true);
          }

          if (timer) {
            clearInterval(timer);
            timer = null;
          }
        }
      } catch (error: any) {
        if (!isMounted) return;

        message.error(
          t('paperSearch.getProgressFailed') + ': ' + error.message,
        );
        setLoading(false);

        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      }
    };

    // 立即获取一次
    fetchSurveyProgress();

    // 设置定时器每2秒轮询一次
    timer = setInterval(() => {
      fetchSurveyProgress();
    }, 2000);

    // 清理函数
    return () => {
      isMounted = false;
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [surveyId, hasShownCompleteMessage, t]);

  // 下载综述文档
  const handleDownload = async () => {
    try {
      console.log('开始下载文档, surveyId:', surveyId);
      const blob = await downloadSurveyDoc(surveyId || '', 'docx');
      console.log('获取到blob:', blob, 'size:', blob.size, 'type:', blob.type);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${t('paperSearch.exportFileNamePrefix')}_${new Date().getTime()}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      message.success(t('paperSearch.downloadSuccess'));
    } catch (error: any) {
      console.error('下载失败:', error);
      message.error(t('paperSearch.downloadFailed') + ': ' + error.message);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-180px)]">
      <div className="text-center mb-0 pb-3 border-b border-gray-200">
        <Title level={2}>{t('paperSearch.surveyResultTitle')}</Title>
        <Space>
          {status === 'completed' && (
            <Button icon={<DownloadOutlined />} onClick={handleDownload}>
              {t('paperSearch.downloadWord')}
            </Button>
          )}
        </Space>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 max-h-[calc(100vh-280px)] border border-gray-200 rounded-md p-4">
        {loading ? (
          <div className="text-center p-10">
            <Spin size="large" />
            <div className="mt-5 max-w-[400px] mx-auto my-5">
              <Progress
                percent={Math.round(progress)}
                status={status === 'failed' ? 'exception' : 'active'}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
              <Text type="secondary" className="block mt-2.5">
                {progressMsg || t('paperSearch.surveyGenerating')}
              </Text>
            </div>
          </div>
        ) : (
          <Card className="rounded-lg h-full">
            {status === 'completed' ? (
              <div className="markdown-content">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex, rehypeRaw]}
                  components={{
                    h1: ({ ...props }) => (
                      <Title level={2} className="mt-6 mb-4" {...props} />
                    ),
                    h2: ({ ...props }) => (
                      <Title level={3} className="mt-5 mb-3" {...props} />
                    ),
                    h3: ({ ...props }) => (
                      <Title level={4} className="mt-4 mb-2.5" {...props} />
                    ),
                    h4: ({ ...props }) => (
                      <Title level={5} className="mt-3 mb-2" {...props} />
                    ),
                    // Custom component for inline code that handles citations
                    code: ({ ...props }) => {
                      // Check if this code element matches the citation pattern
                      if (typeof props.children === 'string') {
                        const citationMatch =
                          props.children.match(/\[CITATION:(\d+)\]/);
                        if (citationMatch) {
                          const citationNum = citationMatch[1];
                          const title =
                            citationMap[citationNum] ||
                            `Reference ${citationNum}`;
                          return (
                            <Tooltip title={title}>
                              <span className="citation-ref">
                                [{citationNum}]
                              </span>
                            </Tooltip>
                          );
                        }
                      }
                      // For non-citation code, render normally
                      return <code {...props} />;
                    },
                  }}
                >
                  {processedContent}
                </ReactMarkdown>

                {/* 引用列表 */}
                {Object.keys(citationMap).length > 0 && (
                  <div className="references-section mt-8 pt-6 border-t border-gray-200">
                    <Title level={3} className="mb-4">
                      {t('paperSearch.references')}
                    </Title>
                    <div className="space-y-2">
                      {Object.entries(citationMap)
                        .sort(([a], [b]) => parseInt(a) - parseInt(b)) // 按引用编号排序
                        .map(([num, title]) => (
                          <div
                            key={num}
                            className="reference-item flex items-start"
                          >
                            <span className="mr-2 font-semibold">[{num}]</span>
                            <span className="flex-1">{title as string}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ) : status === 'failed' ? (
              <div className="text-center p-10">
                <Text type="danger">
                  {t('paperSearch.surveyFailed')}: {progressMsg}
                </Text>
              </div>
            ) : (
              <div className="text-center p-10">
                <Text type="secondary">
                  {t('paperSearch.surveyInProgress')}
                </Text>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

export default SurveyResult;
