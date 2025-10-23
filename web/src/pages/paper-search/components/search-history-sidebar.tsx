import React, { useState, useEffect } from 'react';
import { List, Typography, Spin, Badge } from 'antd';
import { SurveyHistoryRecord } from '@/interfaces/paper-search';
import { getSurveyHistory } from '@/services/paper-search';

const { Text } = Typography;

interface SearchHistorySidebarProps {
  onHistoryClick: (surveyId: string) => void;
}

const SearchHistorySidebar: React.FC<SearchHistorySidebarProps> = ({ onHistoryClick }) => {
  const [historyRecords, setHistoryRecords] = useState<SurveyHistoryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 获取综述历史
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await getSurveyHistory(1, 20);
        setHistoryRecords(data.data.records || []);
      } catch (error) {
        console.error('获取综述历史失败:', error);
        setHistoryRecords([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  // 根据状态返回对应的颜色和文本
  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { color: string; text: string } } = {
      pending: { color: 'default', text: '待处理' },
      processing: { color: 'processing', text: '生成中' },
      completed: { color: 'success', text: '已完成' },
      failed: { color: 'error', text: '失败' },
      cancelled: { color: 'warning', text: '已取消' },
    };
    return statusMap[status] || { color: 'default', text: status };
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <Spin size="small" />
      </div>
    );
  }

  return (
    <div>
      <Text strong style={{ display: 'block', marginBottom: '10px', paddingLeft: '20px' }}>
        综述历史
      </Text>
      {historyRecords.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Text type="secondary">暂无综述历史</Text>
        </div>
      ) : (
        <List
          size="small"
          dataSource={historyRecords}
          renderItem={(item) => {
            const statusInfo = getStatusBadge(item.status);
            return (
              <List.Item
                style={{
                  cursor: 'pointer',
                  padding: '12px 20px',
                  transition: 'background-color 0.2s',
                }}
                onClick={() => onHistoryClick(item.id)}
              >
                <List.Item.Meta
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Text ellipsis={{ tooltip: item.survey_title }} style={{ flex: 1 }}>
                        {item.survey_title}
                      </Text>
                      <Badge
                        status={statusInfo.color as any}
                        text={statusInfo.text}
                        style={{ fontSize: '12px' }}
                      />
                    </div>
                  }
                  description={
                    <div style={{ fontSize: '12px' }}>
                      <Text type="secondary">
                        {new Date(item.created_at).toLocaleString('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </div>
                  }
                />
              </List.Item>
            );
          }}
        />
      )}
    </div>
  );
};

export default SearchHistorySidebar;
