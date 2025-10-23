import React from 'react';
import { Table, Card, Typography, Space, Tag, Button, message } from 'antd';
import { CheckCircleOutlined, EditOutlined } from '@ant-design/icons';
import { Paper } from '@/interfaces/paper-search';

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
  loading,
  onSelectAll,
  onClearAll
}) => {
  const columns = [
    {
      title: '选择',
      key: 'select',
      render: (_: any, record: Paper, index: number) => {
        const isSelected = selectedPapers.has(index.toString());
        return (
          <Button
            type={isSelected ? "primary" : "default"}
            shape="circle"
            size="small"
            icon={isSelected ? <CheckCircleOutlined /> : <EditOutlined />}
            onClick={() => togglePaper(index)}
          />
        );
      },
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: Paper) => (
        <a href={record.url} target="_blank" rel="noopener noreferrer" title={title}>
          {title}
        </a>
      ),
    },
    {
      title: '摘要',
      dataIndex: 'abstract',
      key: 'abstract',
      render: (abstract: string) => (
        <div style={{ maxWidth: '300px' }}>
          {abstract && abstract.length > 100 ? `${abstract.substring(0, 100)}...` : abstract}
        </div>
      ),
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
    },
    {
      title: '相似度',
      dataIndex: 'similarity',
      key: 'similarity',
      render: (similarity: number) => (
        <span>{(similarity * 100).toFixed(2)}%</span>
      ),
    },
    {
      title: '文档ID',
      dataIndex: 'doc_id',
      key: 'doc_id',
      render: (doc_id: string) => (
        <Text code style={{ fontSize: '12px' }}>
          {doc_id?.substring(0, 8)}...
        </Text>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: 'calc(100vh - 180px)' }}>
      <div>
        <Title level={2} style={{ textAlign: 'center', marginBottom: '10px' }}>文献检索结果</Title>
        <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: '20px' }}>
          共检索到 {literatureList.length} 篇相关文献，请选择需要用于综述生成的文献
        </Text>
      </div>

      <div style={{ marginBottom: '20px', textAlign: 'right' }}>
        <Space>
          <Button onClick={onSelectAll} disabled={literatureList.length === 0}>
            全选
          </Button>
          <Button onClick={onClearAll} disabled={selectedPapers.size === 0}>
            清空
          </Button>
          <Text type="secondary">已选择 {selectedPapers.size} / {literatureList.length} 篇文献</Text>
        </Space>
      </div>

      {/* 添加滚动容器包裹论文列表 */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0 10px 20px',
        marginBottom: '20px',
        maxHeight: 'calc(100vh - 300px)'
      }}>
        <Table
          columns={columns}
          dataSource={literatureList.map((item, index) => ({ ...item, key: index }))}
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 篇文献`
          }}
          loading={loading}
        />
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
          onClick={onGenerateSurvey}
          loading={loading}
          disabled={selectedPapers.size === 0}
        >
          基于选中文献生成综述
        </Button>
      </div>
    </div>
  );
};

export default LiteratureList;
