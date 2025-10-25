import { SurveyHistoryRecord } from '@/interfaces/paper-search';
import { getSurveyHistory } from '@/services/paper-search';
import { Badge, List, Spin, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

interface SearchHistorySidebarProps {
  onHistoryClick: (surveyId: string) => void;
}

const SearchHistorySidebar: React.FC<SearchHistorySidebarProps> = ({
  onHistoryClick,
}) => {
  const [historyRecords, setHistoryRecords] = useState<SurveyHistoryRecord[]>(
    [],
  );
  const [loading, setLoading] = useState<boolean>(true);
  const { t } = useTranslation();

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
      pending: { color: 'default', text: t('paperSearch.statusPending') },
      processing: {
        color: 'processing',
        text: t('paperSearch.statusProcessing'),
      },
      completed: { color: 'success', text: t('paperSearch.statusCompleted') },
      failed: { color: 'error', text: t('paperSearch.statusFailed') },
      cancelled: { color: 'warning', text: t('paperSearch.statusCancelled') },
    };
    return statusMap[status] || { color: 'default', text: status };
  };

  if (loading) {
    return (
      <div className="text-center p-5">
        <Spin size="small" />
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-md p-4 h-full">
      <div className="flex items-center justify-between mb-2.5 px-5">
        <Text strong className="text-lg">
          {t('paperSearch.historyTitle')}
        </Text>
        <span className="text-xs text-gray-500">
          {historyRecords.length} {t('paperSearch.items')}
        </span>
      </div>
      {historyRecords.length === 0 ? (
        <div className="text-center p-5">
          <Text type="secondary">{t('paperSearch.noHistory')}</Text>
        </div>
      ) : (
        <List
          size="small"
          dataSource={historyRecords}
          renderItem={(item) => {
            const statusInfo = getStatusBadge(item.status);
            // 计算时间差
            const now = new Date();
            const createdAt = new Date(item.created_at);
            const diffTime = Math.abs(now.getTime() - createdAt.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let dateLabel = '';
            if (diffDays === 1) {
              dateLabel = t('paperSearch.today');
            } else if (diffDays === 2) {
              dateLabel = t('paperSearch.yesterday');
            } else if (diffDays <= 7) {
              dateLabel = `${diffDays - 1} ${t('paperSearch.daysAgo')}`;
            } else {
              dateLabel = new Date(item.created_at).toLocaleDateString(
                'zh-CN',
                {
                  month: 'short',
                  day: 'numeric',
                },
              );
            }

            return (
              <List.Item
                className="cursor-pointer px-5 py-3 transition-colors hover:bg-gray-50 border-l-4 border-gray-200 hover:border-blue-400"
                onClick={() => onHistoryClick(item.id)}
              >
                <List.Item.Meta
                  title={
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <Text
                        ellipsis={{ tooltip: item.survey_title }}
                        className="flex-1 font-medium text-base"
                      >
                        {item.survey_title}
                      </Text>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {new Date(item.created_at).toLocaleTimeString(
                            'zh-CN',
                            {
                              hour: '2-digit',
                              minute: '2-digit',
                            },
                          )}
                        </span>
                        <Badge
                          status={statusInfo.color as any}
                          text={statusInfo.text}
                          className="hidden sm:block"
                        />
                      </div>
                    </div>
                  }
                  description={
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-1">
                      <div className="text-sm font-medium">
                        <Text
                          className={
                            diffDays <= 1
                              ? 'text-blue-600'
                              : diffDays <= 7
                                ? 'text-green-600'
                                : 'text-gray-600'
                          }
                        >
                          {dateLabel}
                        </Text>
                      </div>
                      <div className="sm:hidden mt-1">
                        <Badge
                          status={statusInfo.color as any}
                          text={statusInfo.text}
                        />
                      </div>
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
