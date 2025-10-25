import { Button } from '@/components/ui/button';
import { Paper } from '@/interfaces/paper-search';
import { api_host } from '@/utils/api';
import { List, message, Modal, Space, Spin, Typography } from 'antd';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

interface LiteratureListProps {
  literatureList: Paper[];
  selectedPapers: Set<string>;
  togglePaper: (index: number) => void;
  onGenerateSurvey: () => void;
  loading: boolean;
  onSelectAll: () => void;
  onClearAll: () => void;
}

const LiteratureList: React.FC<LiteratureListProps> = ({
  literatureList,
  selectedPapers,
  togglePaper,
  onGenerateSurvey,
  onSelectAll,
  onClearAll,
}) => {
  const { t } = useTranslation();

  // PDF modal state
  const [pdfModalVisible, setPdfModalVisible] = useState<boolean>(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);

  const closePdfModal = useCallback(() => {
    setPdfModalVisible(false);
    if (pdfUrl) {
      try {
        window.URL.revokeObjectURL(pdfUrl);
      } catch (e) {
        // ignore
      }
    }
    setPdfUrl(null);
    setPdfLoadingId(null);
  }, [pdfUrl]);

  return (
    <div className="flex flex-col min-h-0">
      <div className="text-center mb-6">
        <Title level={2} className="mb-2 text-center">
          {t('paperSearch.searchResults') || 'Search Results'}
        </Title>
        <Text type="secondary" className="block text-center mb-6">
          {t('common.total') || 'Found'} {literatureList.length}{' '}
          {t('knowledgeDetails.files') || 'papers'}.{' '}
          {t('paperSearch.selectForSurvey') ||
            'Select papers to use for survey generation'}
          .
        </Text>
      </div>

      <div className="mb-6 flex justify-end">
        <Space>
          <Button onClick={onSelectAll} disabled={literatureList.length === 0}>
            {t('common.selectAll') || 'Select All'}
          </Button>
          <Button onClick={onClearAll} disabled={selectedPapers.size === 0}>
            {t('common.clear') || 'Clear All'}
          </Button>
          <Text type="secondary">
            {selectedPapers.size} {t('common.of') || 'of'}{' '}
            {literatureList.length} {t('knowledgeDetails.files') || 'papers'}{' '}
            {t('common.selected') || 'selected'}
          </Text>
        </Space>
      </div>

      {/* 限制列表高度为视口高度减去页面其它区域，避免把底部按钮挤出 */}
      {/* 调低可用高度以确保底部按钮始终可见 */}
      <div className="flex-1 overflow-auto max-h-[calc(100vh-480px)] border border-gray-200 rounded-md p-4">
        <List
          dataSource={literatureList}
          renderItem={(paper, index) => {
            const isSelected = selectedPapers.has(index.toString());
            return (
              <List.Item
                key={index}
                className={`p-3 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                  isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
                onClick={() => togglePaper(index)}
              >
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`truncate ${isSelected ? 'text-blue-600 font-semibold' : ''}`}
                    >
                      {paper.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                      {(paper.similarity * 100).toFixed(2)}% match
                    </span>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={async (e: React.MouseEvent) => {
                        e.stopPropagation();
                        if (!paper.doc_id) {
                          message.error(t('paperSearch.docIdNotFound'));
                          return;
                        }

                        // avoid duplicate loads for same doc
                        if (pdfLoadingId === paper.doc_id) return;
                        setPdfLoadingId(paper.doc_id);

                        try {
                          const url = `${api_host}/document/get/${paper.doc_id}`;
                          const resp = await fetch(url, {
                            credentials: 'include',
                          });
                          if (!resp.ok) {
                            throw new Error(`HTTP ${resp.status}`);
                          }
                          const blob = await resp.blob();

                          const blobUrl = window.URL.createObjectURL(blob);
                          setPdfUrl(blobUrl);
                          setPdfModalVisible(true);
                        } catch (err: any) {
                          console.error('打开文档失败', err);
                          message.error(
                            t('paperSearch.openDocumentFailed') +
                              ': ' +
                              (err?.message || err),
                          );
                          setPdfLoadingId(null);
                        }
                      }}
                      disabled={!!pdfLoadingId && pdfLoadingId !== paper.doc_id}
                    >
                      {pdfLoadingId === paper.doc_id ? (
                        <Spin size="small" />
                      ) : (
                        t('paperSearch.viewPdf')
                      )}
                    </Button>
                  </div>
                </div>
              </List.Item>
            );
          }}
        />
      </div>

      {/* PDF Modal - embedded viewer */}
      <Modal
        className="pdf-modal"
        title={t('paperSearch.previewPdf') || 'Preview PDF'}
        open={pdfModalVisible}
        onCancel={closePdfModal}
        onOk={closePdfModal}
        footer={null}
        destroyOnClose
        style={{ top: 20 }}
        width={Math.min(
          typeof window !== 'undefined' ? window.innerWidth * 0.9 : 1000,
          1200,
        )}
        bodyStyle={{ padding: 0, height: '70vh', overflow: 'hidden' }}
      >
        {/* 将滚动限制在 modal body 内，避免 pdf 内容溢出到模态框外 */}
        <div className="pdf-modal-scroller h-full overflow-auto">
          {pdfUrl ? (
            // 使用浏览器内置的 PDF 查看器（iframe）来确保在 modal 内自适应并产生内部滚动条，
            // 这比 PdfHighlighter 更容易在受限容器内正确缩放和滚动。
            <div className="pdf-preview-wrapper h-full w-full">
              <iframe
                src={pdfUrl}
                title="PDF Preview"
                className="w-full h-full"
                frameBorder={0}
                // allowFullScreen in case user wants full screen view
                allowFullScreen
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <Spin />
            </div>
          )}
        </div>
      </Modal>

      <div className="text-center pt-6 border-t">
        <Button
          variant="default"
          size="lg"
          onClick={onGenerateSurvey}
          disabled={selectedPapers.size === 0}
          className="px-8 py-6 text-lg"
        >
          {t('paperSearch.generateSurvey') ||
            'Generate Survey from Selected Papers'}
        </Button>
      </div>
    </div>
  );
};

export default LiteratureList;
