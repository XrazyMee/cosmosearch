import { MoreButton } from '@/components/more-button';
import { SharedBadge } from '@/components/shared-badge';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigatePage } from '@/hooks/logic-hooks/navigate-hooks';
import { Paper } from '@/interfaces/paper-search';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PaperDropdown } from './paper-dropdown';
import { useRenamePaper } from './use-rename-paper';

export type PaperCardProps = {
  paper: Paper;
  togglePaper?: (index: number) => void;
  index?: number;
} & Pick<ReturnType<typeof useRenamePaper>, 'showPaperRenameModal'>;

export function PaperCard({
  paper,
  togglePaper,
  index = 0,
  showPaperRenameModal,
}: PaperCardProps) {
  const { t } = useTranslation();
  const { navigateToSearch } = useNavigatePage();

  // Determine if the paper is selected based on the selected state
  const isSelected = paper.selected;

  return (
    <Card
      className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}`}
      onClick={(e) => {
        e.stopPropagation();
        if (togglePaper && index !== undefined) {
          togglePaper(index);
        } else if (paper.url) {
          window.open(paper.url, '_blank');
        }
      }}
    >
      <CardContent className="p-4 flex gap-2 items-start group h-full">
        <div className="flex justify-between mb-4">
          <div className="w-[32px] h-[32px] rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-blue-600 font-medium text-sm">
              {paper.title.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
        <div className="flex flex-col justify-between gap-1 flex-1 h-full w-[calc(100%-50px)]">
          <section className="flex justify-between">
            <section className="flex flex-1 min-w-0 gap-1 items-center">
              <div
                className={`text-base font-bold leading-snug truncate ${isSelected ? 'text-blue-600' : ''}`}
              >
                {paper.title}
              </div>
            </section>
            <PaperDropdown
              showPaperRenameModal={showPaperRenameModal}
              paper={paper}
            >
              <MoreButton></MoreButton>
            </PaperDropdown>
          </section>

          <section className="flex flex-col gap-1 mt-1">
            <div className="whitespace-nowrap overflow-hidden text-ellipsis text-sm">
              {paper.abstract
                ? paper.abstract.length > 100
                  ? `${paper.abstract.substring(0, 100)}...`
                  : paper.abstract
                : t('paperSearch.noAbstract') ||
                  t('message.noResults') ||
                  'No abstract available'}
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm opacity-80 whitespace-nowrap">
                {paper.source ||
                  t('paperSearch.unknownSource') ||
                  'Unknown Source'}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {(paper.similarity * 100).toFixed(2)}% match
                </span>
                <SharedBadge>{paper.source}</SharedBadge>
              </div>
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  );
}

export function SeeAllCard() {
  const { navigateToSearch } = useNavigatePage();

  return (
    <Card className="w-40 flex-none h-full" onClick={navigateToSearch}>
      <CardContent className="p-2.5 pt-1 w-full h-full flex items-center justify-center gap-1.5 text-text-secondary">
        See All <ChevronRight className="size-4" />
      </CardContent>
    </Card>
  );
}
