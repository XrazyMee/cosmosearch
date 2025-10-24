import { CardContainer } from '@/components/card-container';
import { Button } from '@/components/ui/button';
import { Paper } from '@/interfaces/paper-search';
import { Space, Typography } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { PaperCard } from '../paper-card';
import { useRenamePaper } from '../use-rename-paper';

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
  onClearAll,
}) => {
  const { t } = useTranslation();
  const { showPaperRenameModal } = useRenamePaper();

  return (
    <div className="flex flex-col h-full">
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

      <div className="flex-1 overflow-auto max-h-[calc(100vh-300px)]">
        <CardContainer>
          {literatureList.map((paper, index) => {
            const isSelected = selectedPapers.has(index.toString());
            return (
              <PaperCard
                key={index}
                paper={{ ...paper, selected: isSelected }}
                showPaperRenameModal={showPaperRenameModal}
                togglePaper={togglePaper}
                index={index}
              />
            );
          })}
        </CardContainer>
      </div>

      <div className="text-center pt-6 border-t">
        <Button
          variant="default"
          size="lg"
          onClick={onGenerateSurvey}
          loading={loading}
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
