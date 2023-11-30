import {
  IconFileArrowLeft,
  IconFileArrowRight,
  IconPaperclip,
  IconScale,
  IconTrashX,
  IconUserShare,
} from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';

import { useTranslation } from 'next-i18next';

import { SharedByMeFilters } from '@/src/utils/app/folders';

import { HighlightColor } from '@/src/types/common';
import { Feature } from '@/src/types/features';
import { DisplayMenuItemProps } from '@/src/types/menu';
import { Translation } from '@/src/types/translation';

import {
  ConversationsActions,
  ConversationsSelectors,
} from '@/src/store/conversations/conversations.reducers';
import { useAppDispatch, useAppSelector } from '@/src/store/hooks';
import { SettingsSelectors } from '@/src/store/settings/settings.reducers';

import { DEFAULT_CONVERSATION_NAME } from '@/src/constants/default-settings';

import { ConfirmDialog } from '@/src/components/Common/ConfirmDialog';
import SidebarMenu from '@/src/components/Common/SidebarMenu';
import { FileManagerModal } from '@/src/components/Files/FileManagerModal';
import { Import } from '@/src/components/Settings/Import';

import { SharingType } from '../../Chat/ShareModal';
import SharedByMeModal from '../../Chat/SharedByMe';

import FolderPlus from '@/public/images/icons/folder-plus.svg';

export const ChatbarSettings = () => {
  const { t } = useTranslation(Translation.SideBar);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isSharedModalOpen, setIsSharedModalOpen] = useState(false);

  const dispatch = useAppDispatch();

  const conversations = useAppSelector(
    ConversationsSelectors.selectConversations,
  );
  const isStreaming = useAppSelector(
    ConversationsSelectors.selectIsConversationsStreaming,
  );
  const enabledFeatures = useAppSelector(
    SettingsSelectors.selectEnabledFeatures,
  );
  const [isSelectFilesDialogOpened, setIsSelectFilesDialogOpened] =
    useState(false);
  const availableAttachmentsTypes = useAppSelector(
    ConversationsSelectors.selectAvailableAttachmentsTypes,
  );
  const maximumAttachmentsAmount = useAppSelector(
    ConversationsSelectors.selectMaximumAttachmentsAmount,
  );

  const handleToggleCompare = useCallback(() => {
    dispatch(
      ConversationsActions.createNewConversations({
        names: [DEFAULT_CONVERSATION_NAME, DEFAULT_CONVERSATION_NAME],
      }),
    );
  }, [dispatch]);

  const menuItems: DisplayMenuItemProps[] = useMemo(
    () => [
      {
        name: t('Shared by me'),
        display:
          enabledFeatures.has(Feature.ConversationsSharing) &&
          conversations.filter(SharedByMeFilters.filterItem).length > 0,
        dataQa: 'shared-by-me',
        Icon: IconUserShare,
        onClick: () => {
          setIsSharedModalOpen(true);
        },
      },
      {
        name: t('Delete all conversations'),
        display: conversations.length > 0,
        dataQa: 'delete-conversations',
        Icon: IconTrashX,
        onClick: () => {
          setIsClearModalOpen(true);
        },
      },
      {
        name: t('Import conversations'),
        onClick: (importJSON) => {
          dispatch(
            ConversationsActions.importConversations({ data: importJSON }),
          );
        },
        Icon: IconFileArrowLeft,
        dataQa: 'import',
        CustomTriggerRenderer: Import,
      },
      {
        name: t('Export conversations'),
        dataQa: 'export-conversations',
        Icon: IconFileArrowRight,
        onClick: () => {
          dispatch(ConversationsActions.exportConversations());
        },
      },
      {
        name: t('Create new folder'),
        dataQa: 'create-folder',
        Icon: FolderPlus,
        onClick: () => {
          dispatch(
            ConversationsActions.createFolder({ name: t('New folder') }),
          );
        },
      },
      {
        name: t('Compare mode'),
        dataQa: 'compare',
        Icon: IconScale,
        disabled: isStreaming,
        onClick: () => {
          handleToggleCompare();
        },
      },
      {
        name: t('Attachments'),
        display: enabledFeatures.has(Feature.AttachmentsManager),
        dataQa: 'attachments',
        Icon: IconPaperclip,
        disabled: isStreaming,
        onClick: () => {
          setIsSelectFilesDialogOpened(true);
        },
      },
    ],
    [
      conversations,
      dispatch,
      enabledFeatures,
      handleToggleCompare,
      isStreaming,
      t,
    ],
  );

  return (
    <>
      <SidebarMenu
        menuItems={menuItems}
        highlightColor={HighlightColor.Green}
      />

      {isSelectFilesDialogOpened && (
        <FileManagerModal
          isOpen
          allowedTypes={availableAttachmentsTypes}
          maximumAttachmentsAmount={maximumAttachmentsAmount}
          onClose={() => {
            setIsSelectFilesDialogOpened(false);
          }}
        />
      )}

      <ConfirmDialog
        isOpen={isClearModalOpen}
        heading={t('Confirm clearing all conversations')}
        description={
          t('Are you sure that you want to delete all conversations?') || ''
        }
        confirmLabel={t('Clear')}
        cancelLabel={t('Cancel')}
        onClose={(result) => {
          setIsClearModalOpen(false);
          if (result) {
            dispatch(ConversationsActions.clearConversations());
          }
        }}
      />

      <SharedByMeModal
        isOpen={isSharedModalOpen}
        onClose={() => setIsSharedModalOpen(false)}
        type={SharingType.Conversation}
      />
    </>
  );
};
