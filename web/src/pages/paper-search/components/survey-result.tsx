import React, { useEffect, useState, useMemo } from 'react';
import { Button, Typography, Space, Card, Spin, message, Progress, Modal } from 'antd';
import { ReloadOutlined, DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
import { getSurveyProgress, downloadSurveyDoc } from '@/services/paper-search';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import './survey-result.css';

const { Title, Text } = Typography;

interface SurveyResultProps {
  surveyResult: any;
  surveyId?: string;
  onNewSearch: () => void;
}

const SurveyResult: React.FC<SurveyResultProps> = ({ surveyResult, surveyId, onNewSearch }) => {
  const [surveyContent, setSurveyContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [status, setStatus] = useState<'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'>('pending');
  const [progress, setProgress] = useState<number>(0);
  const [progressMsg, setProgressMsg] = useState<string>('等待处理');
  const [hasShownCompleteMessage, setHasShownCompleteMessage] = useState<boolean>(false);
  const [paperReferences, setPaperReferences] = useState<{ [key: number]: string }>({});
  const [papers, setPapers] = useState<any[]>([]);

  // 处理综述内容，提取引用信息并转换引用标注为 HTML
  const processedContent = useMemo(() => {
    if (!surveyContent) return '';

    // 优先使用从后端返回的文献列表构建引用映射
    if (papers && papers.length > 0) {
      const refs: { [key: number]: string } = {};
      papers.forEach((paper, index) => {
        refs[index + 1] = paper.title || '未知标题';
      });
      setPaperReferences(refs);
    } else {
      // 如果没有文献列表，尝试从综述内容中提取引用编号对应关系
      const refPattern = /##(\d+)\$\$ - (.+?)(?:\n|$)/g;
      const refs: { [key: number]: string } = {};
      let match;

      let tempContent = surveyContent;
      while ((match = refPattern.exec(tempContent)) !== null) {
        const num = parseInt(match[1]);
        const title = match[2].trim();
        refs[num] = title;
      }

      setPaperReferences(refs);
    }

    // 移除引用编号对应关系部分（如果存在）
    let content = surveyContent.replace(/###引用编号对应关系###[\s\S]*?(?=###|$)/g, '');

    // 将 ##数字$$ 格式转换为 HTML span 标签以便正确渲染
    // 匹配单个或多个引用，例如: ##1$$ 或 ##1## ##2## ##3##
    content = content.replace(/##(\d+)\$\$/g, (match, num) => {
      return `<span class="citation-ref" data-ref="${num}" title="点击查看引用详情">[${num}]</span>`;
    });

    return content;
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
            message.success('综述生成完成');
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
            message.error(`综述生成失败: ${progressData.progress_msg}`);
            setHasShownCompleteMessage(true);
          }

          if (timer) {
            clearInterval(timer);
            timer = null;
          }
        } else if (progressData.status === 'cancelled') {
          setLoading(false);

          if (!hasShownCompleteMessage) {
            message.warning('综述生成已取消');
            setHasShownCompleteMessage(true);
          }

          if (timer) {
            clearInterval(timer);
            timer = null;
          }
        }
      } catch (error: any) {
        if (!isMounted) return;

        message.error('获取综述进度失败: ' + error.message);
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
  }, [surveyId, hasShownCompleteMessage]);

  // 下载综述文档
  const handleDownload = async () => {
    try {
      console.log('开始下载文档, surveyId:', surveyId);
      const blob = await downloadSurveyDoc(surveyId || '', 'docx');
      console.log('获取到blob:', blob, 'size:', blob.size, 'type:', blob.type);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `文献综述_${new Date().getTime()}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      message.success('下载成功');
    } catch (error: any) {
      console.error('下载失败:', error);
      message.error('下载失败: ' + error.message);
    }
  };

  // 添加引用点击事件监听
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('citation-ref')) {
        const refNum = target.getAttribute('data-ref');
        if (refNum) {
          const num = parseInt(refNum);
          const title = paperReferences[num];
          const paper = papers[num - 1]; // 数组索引从0开始

          if (paper) {
            // 显示完整的文献信息弹窗
            Modal.info({
              title: `引用文献 [${refNum}]`,
              width: 600,
              icon: <FileTextOutlined style={{ color: '#1890ff' }} />,
              content: (
                <div style={{ marginTop: '16px' }}>
                  <p><strong>标题：</strong>{paper.title || '未知标题'}</p>
                  {paper.abstract && (
                    <p><strong>摘要：</strong>{paper.abstract}</p>
                  )}
                  {paper.source && (
                    <p><strong>来源：</strong>{paper.source}</p>
                  )}
                  {paper.similarity !== undefined && (
                    <p><strong>相似度：</strong>{(paper.similarity * 100).toFixed(2)}%</p>
                  )}
                </div>
              ),
            });
          } else if (title) {
            // 如果没有完整的paper对象，只显示标题
            Modal.info({
              title: `引用文献 [${refNum}]`,
              content: title,
            });
          } else {
            message.warning(`未找到引用 [${refNum}] 的详细信息`);
          }
        }
      }
    };

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [paperReferences, papers]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: 'calc(100vh - 180px)' }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '20px',
        paddingBottom: '20px',
        borderBottom: '1px solid #f0f0f0'
      }}>
        <Title level={2}>文献综述结果</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={onNewSearch}>
            重新检索
          </Button>
          {status === 'completed' && (
            <Button icon={<DownloadOutlined />} onClick={handleDownload}>
              下载Word文档
            </Button>
          )}
        </Space>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0 10px',
        maxHeight: 'calc(100vh - 280px)'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
            <div style={{ marginTop: '20px', maxWidth: '400px', margin: '20px auto' }}>
              <Progress
                percent={Math.round(progress)}
                status={status === 'failed' ? 'exception' : 'active'}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
              <Text type="secondary" style={{ display: 'block', marginTop: '10px' }}>
                {progressMsg || '正在生成文献综述，请稍候...'}
              </Text>
            </div>
          </div>
        ) : (
          <Card style={{ borderRadius: '8px' }}>
            {status === 'completed' ? (
              <div className="markdown-content">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex, rehypeRaw]}
                  components={{
                    h1: ({...props}) => <Title level={2} style={{ marginTop: '24px', marginBottom: '16px' }} {...props} />,
                    h2: ({...props}) => <Title level={3} style={{ marginTop: '20px', marginBottom: '12px' }} {...props} />,
                    h3: ({...props}) => <Title level={4} style={{ marginTop: '16px', marginBottom: '10px' }} {...props} />,
                    h4: ({...props}) => <Title level={5} style={{ marginTop: '12px', marginBottom: '8px' }} {...props} />,
                  }}
                >
                  {processedContent}
                </ReactMarkdown>
              </div>
            ) : status === 'failed' ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Text type="danger">综述生成失败: {progressMsg}</Text>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Text type="secondary">综述仍在生成中，请稍后再来查看...</Text>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

export default SurveyResult;
