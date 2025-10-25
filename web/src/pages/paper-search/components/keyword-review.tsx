import { KeywordGroup } from '@/interfaces/paper-search';
import {
  CheckCircleOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  Button,
  ConfigProvider,
  Divider,
  Input,
  message,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

interface KeywordReviewProps {
  keywords: KeywordGroup;
  selectedKeywords: Set<string>;
  toggleKeyword: (type: string, index: number) => void;
  onConfirm: () => void;
  loading: boolean;
  onAddCustomKeyword: (keyword: string) => void;
  customKeywords: string[];
  onRemoveCustomKeyword: (index: number) => void;
  toggleCustomKeyword: (type: string, index: number) => void;
}

const KeywordReview: React.FC<KeywordReviewProps> = ({
  keywords,
  selectedKeywords,
  toggleKeyword,
  onConfirm,
  loading,
  onAddCustomKeyword,
  customKeywords,
  onRemoveCustomKeyword,
  toggleCustomKeyword,
}) => {
  const { t } = useTranslation();
  const {
    keyword_en = [],
    keyword_cn = [],
    searchquery_en = [],
    searchquery_cn = [],
    time_range = [],
  } = keywords;

  const allKeywords = [
    ...keyword_en.map((kw, idx) => ({
      text: kw,
      type: 'keyword_en',
      index: idx,
      category: 'keyword_en',
    })),
    ...keyword_cn.map((kw, idx) => ({
      text: kw,
      type: 'keyword_cn',
      index: idx,
      category: 'keyword_cn',
    })),
    ...searchquery_en.map((kw, idx) => ({
      text: kw,
      type: 'searchquery_en',
      index: idx,
      category: 'searchquery_en',
    })),
    ...searchquery_cn.map((kw, idx) => ({
      text: kw,
      type: 'searchquery_cn',
      index: idx,
      category: 'searchquery_cn',
    })),
  ];

  // 添加自定义关键词的输入状态
  const [customKeywordInput, setCustomKeywordInput] = useState<string>('');

  const isKeywordsEmpty =
    (!keyword_en || keyword_en.length === 0) &&
    (!keyword_cn || keyword_cn.length === 0) &&
    (!searchquery_en || searchquery_en.length === 0) &&
    (!searchquery_cn || searchquery_cn.length === 0) &&
    (!customKeywords || customKeywords.length === 0);

  // 当处于 loading 且关键词尚未返回时，显示加载占位
  if (loading && isKeywordsEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-[320px]">
        <Spin size="large" />
        <div className="mt-3 text-gray-500">
          {t('paperSearch.extractingKeywords')}
        </div>
      </div>
    );
  }

  // 处理添加自定义关键词
  const handleAddCustomKeyword = () => {
    if (!customKeywordInput.trim()) {
      message.warning(t('paperSearch.enterKeyword'));
      return;
    }

    if (customKeywords.includes(customKeywordInput.trim())) {
      message.warning(t('paperSearch.keywordExists'));
      return;
    }

    onAddCustomKeyword(customKeywordInput.trim());
    setCustomKeywordInput('');
  };

  // 处理回车添加关键词
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddCustomKeyword();
    }
  };

  return (
    <ConfigProvider
      theme={{
        components: {
          Tag: {
            defaultColor: '#1890ff',
          },
        },
      }}
    >
      <div className="flex flex-col h-full max-h-[calc(100vh-180px)]">
        <div>
          <Title level={2} className="text-center mb-2.5">
            {t('paperSearch.keywordReviewTitle')}
          </Title>
          <Text type="secondary" className="block text-center mb-5">
            {t('paperSearch.keywordReviewDescription')}
          </Text>
        </div>

        <div className="flex-1 overflow-y-auto px-2.5 pb-5 mb-5 max-h-[calc(100vh-280px)] border border-gray-200 rounded-md p-4">
          {/* 手动输入关键词区域 */}
          <div className="mb-5 p-4 bg-gray-50 rounded-md">
            <div className="mb-2.5">
              <Text strong>{t('paperSearch.manualAddTitle')}</Text>
            </div>
            <div className="flex gap-2.5 items-center">
              <Input
                placeholder={t('paperSearch.customKeywordPlaceholder')}
                value={customKeywordInput}
                onChange={(e) => setCustomKeywordInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddCustomKeyword}
                disabled={!customKeywordInput.trim()}
              >
                {t('paperSearch.add')}
              </Button>
            </div>

            {/* 显示已添加的自定义关键词 */}
            {customKeywords.length > 0 && (
              <div className="mt-3">
                <Divider orientation="left" className="mt-2.5">
                  {t('paperSearch.customKeywords')}
                </Divider>
                <Space wrap className="mb-2.5">
                  {customKeywords.map((keyword, idx) => {
                    const key = `custom_${idx}`;
                    const isSelected = selectedKeywords.has(key);

                    return (
                      <Tag
                        key={key}
                        color={isSelected ? 'blue' : 'default'}
                        closable
                        onClose={(e) => {
                          e.preventDefault();
                          onRemoveCustomKeyword(idx);
                        }}
                        className="cursor-pointer text-sm px-3 py-2 rounded-full"
                        onClick={() => toggleCustomKeyword('custom', idx)}
                        icon={
                          isSelected ? (
                            <CheckCircleOutlined />
                          ) : (
                            <EditOutlined />
                          )
                        }
                      >
                        {keyword}
                      </Tag>
                    );
                  })}
                </Space>
              </div>
            )}
          </div>

          <div className="mb-5">
            {[
              { id: 'keyword_en', label: t('paperSearch.keywordEnCategory') },
              { id: 'keyword_cn', label: t('paperSearch.keywordCnCategory') },
              {
                id: 'searchquery_en',
                label: t('paperSearch.searchQueryEnCategory'),
              },
              {
                id: 'searchquery_cn',
                label: t('paperSearch.searchQueryCnCategory'),
              },
            ].map((category) => {
              const categoryKeywords = allKeywords.filter(
                (kw) => kw.category === category.id,
              );
              if (categoryKeywords.length === 0) return null;

              return (
                <div key={category.id} className="mb-5">
                  <Divider orientation="left">{category.label}</Divider>
                  <Space wrap className="mb-2.5">
                    {categoryKeywords.map((kw) => {
                      const key = `${kw.type}_${kw.index}`;
                      const isSelected = selectedKeywords.has(key);

                      return (
                        <Tag
                          key={key}
                          color={isSelected ? 'blue' : 'default'}
                          closable={false}
                          className="cursor-pointer text-sm px-3 py-2 rounded-full"
                          onClick={() => toggleKeyword(kw.type, kw.index)}
                          icon={
                            isSelected ? (
                              <CheckCircleOutlined />
                            ) : (
                              <EditOutlined />
                            )
                          }
                        >
                          {kw.text}
                        </Tag>
                      );
                    })}
                  </Space>
                </div>
              );
            })}
          </div>

          {time_range && time_range.length > 0 && (
            <div className="mb-5">
              <Divider orientation="left">{t('paperSearch.timeRange')}</Divider>
              <Space wrap>
                {time_range.map((year, idx) => (
                  <Tag
                    key={`year_${idx}`}
                    color="green"
                    className="text-sm px-3 py-2"
                  >
                    {year}年
                  </Tag>
                ))}
              </Space>
            </div>
          )}
        </div>

        <div className="text-center pt-5 border-t border-gray-200 sticky bottom-0 bg-white z-10">
          <Button
            type="primary"
            size="large"
            onClick={onConfirm}
            loading={loading}
            disabled={selectedKeywords.size === 0}
          >
            {t('paperSearch.confirmAndSearch')}
          </Button>
          <div className="mt-2.5">
            <Text type="secondary">
              {t('paperSearch.selectedKeywords', {
                count: selectedKeywords.size,
              })}
            </Text>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default KeywordReview;
