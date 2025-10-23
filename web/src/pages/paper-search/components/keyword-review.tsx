import React, { useState } from 'react';
import { Card, Typography, Space, Tag, Button, Row, Col, Divider, ConfigProvider, Input, message } from 'antd';
import { CheckCircleOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { KeywordGroup } from '@/interfaces/paper-search';

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
  toggleCustomKeyword
}) => {
  const { keyword_en = [], keyword_cn = [], searchquery_en = [], searchquery_cn = [], time_range = [] } = keywords;

  const allKeywords = [
    ...keyword_en.map((kw, idx) => ({ text: kw, type: 'keyword_en', index: idx, category: '关键词(英文)' })),
    ...keyword_cn.map((kw, idx) => ({ text: kw, type: 'keyword_cn', index: idx, category: '关键词(中文)' })),
    ...searchquery_en.map((kw, idx) => ({ text: kw, type: 'searchquery_en', index: idx, category: '搜索句(英文)' })),
    ...searchquery_cn.map((kw, idx) => ({ text: kw, type: 'searchquery_cn', index: idx, category: '搜索句(中文)' }))
  ];

  // 添加自定义关键词的输入状态
  const [customKeywordInput, setCustomKeywordInput] = useState<string>('');

  // 处理添加自定义关键词
  const handleAddCustomKeyword = () => {
    if (!customKeywordInput.trim()) {
      message.warning('请输入关键词');
      return;
    }

    if (customKeywords.includes(customKeywordInput.trim())) {
      message.warning('此关键词已存在');
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
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: 'calc(100vh - 180px)' }}>
        <div>
          <Title level={2} style={{ textAlign: 'center', marginBottom: '10px' }}>关键词审核</Title>
          <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: '20px' }}>
            请选择与您研究主题相关的关键词，这些关键词将用于文献检索
          </Text>
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 10px 20px',
          marginBottom: '20px',
          maxHeight: 'calc(100vh - 280px)'
        }}>
          {/* 手动输入关键词区域 */}
          <div style={{ marginBottom: '20px', padding: '15px', background: '#f9f9f9', borderRadius: '6px' }}>
            <div style={{ marginBottom: '10px' }}>
              <Text strong>手动添加关键词</Text>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <Input
                placeholder="输入自定义关键词"
                value={customKeywordInput}
                onChange={(e) => setCustomKeywordInput(e.target.value)}
                onKeyPress={handleKeyPress}
                style={{ flex: 1 }}
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddCustomKeyword}
                disabled={!customKeywordInput.trim()}
              >
                添加
              </Button>
            </div>

            {/* 显示已添加的自定义关键词 */}
            {customKeywords.length > 0 && (
              <div style={{ marginTop: '15px' }}>
                <Divider orientation="left" style={{ marginTop: '10px' }}>自定义关键词</Divider>
                <Space wrap style={{ marginBottom: '10px' }}>
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
                        style={{
                          cursor: 'pointer',
                          fontSize: '14px',
                          padding: '8px 12px',
                          borderRadius: '20px',
                          border: '2px solid transparent'
                        }}
                        onClick={() => toggleCustomKeyword('custom', idx)}
                        icon={isSelected ? <CheckCircleOutlined /> : <EditOutlined />}
                      >
                        {keyword}
                      </Tag>
                    );
                  })}
                </Space>
              </div>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            {['关键词(英文)', '关键词(中文)', '搜索句(英文)', '搜索句(中文)'].map(category => {
              const categoryKeywords = allKeywords.filter(kw => kw.category === category);
              if (categoryKeywords.length === 0) return null;

              return (
                <div key={category} style={{ marginBottom: '20px' }}>
                  <Divider orientation="left">{category}</Divider>
                  <Space wrap style={{ marginBottom: '10px' }}>
                    {categoryKeywords.map((kw, idx) => {
                      const key = `${kw.type}_${kw.index}`;
                      const isSelected = selectedKeywords.has(key);

                      return (
                        <Tag
                          key={key}
                          color={isSelected ? 'blue' : 'default'}
                          closable={false}
                          style={{
                            cursor: 'pointer',
                            fontSize: '14px',
                            padding: '8px 12px',
                            borderRadius: '20px',
                            border: '2px solid transparent'
                          }}
                          onClick={() => toggleKeyword(kw.type, kw.index)}
                          icon={isSelected ? <CheckCircleOutlined /> : <EditOutlined />}
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
            <div style={{ marginBottom: '20px' }}>
              <Divider orientation="left">时间范围</Divider>
              <Space wrap>
                {time_range.map((year, idx) => (
                  <Tag key={`year_${idx}`} color="green" style={{ fontSize: '14px', padding: '8px 12px' }}>
                    {year}年
                  </Tag>
                ))}
              </Space>
            </div>
          )}
        </div>

        <div style={{
          textAlign: 'center',
          padding: '20px 0 0',
          borderTop: '1px solid #f0f0f0',
          position: 'sticky',
          bottom: 0,
          background: '#fff',
          zIndex: 10
        }}>
          <Button
            type="primary"
            size="large"
            onClick={onConfirm}
            loading={loading}
            disabled={selectedKeywords.size === 0}
          >
            确认选择并检索文献
          </Button>
          <div style={{ marginTop: '10px' }}>
            <Text type="secondary">已选择 {selectedKeywords.size} 个关键词</Text>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default KeywordReview;
