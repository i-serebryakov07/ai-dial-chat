import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import { useTranslation } from 'next-i18next';

import classNames from 'classnames';

import { Replay } from '@/src/types/chat';
import { OpenAIEntityModel } from '@/src/types/openai';
import { Prompt } from '@/src/types/prompt';

import { useAppSelector } from '@/src/store/hooks';
import { ModelsSelectors } from '@/src/store/models/models.reducers';
import { UISelectors } from '@/src/store/ui/ui.reducers';

import { DEFAULT_ASSISTANT_SUBMODEL } from '@/src/constants/default-settings';

import { ModelIcon } from '../Chatbar/components/ModelIcon';

import XMark from '../../../public/images/icons/xmark.svg';
import { Addons } from './Addons';
import { AssistantSubModelSelector } from './AssistantSubModelSelector';
import { ConversationSettingsModel } from './ConversationSettingsModels';
import { ModelDescription } from './ModelDescription';
import { ReplayAsIsDescription } from './ReplayAsIsDescription';
import { SystemPrompt } from './SystemPrompt';
import { TemperatureSlider } from './Temperature';

interface ModelSelectRowProps {
  item: OpenAIEntityModel;
}

interface SettingContainerProps {
  children: ReactNode;
}

interface Props {
  modelId: string | undefined;
  assistantModelId: string | undefined;
  prompt: string | undefined;
  temperature: number | undefined;
  prompts: Prompt[];
  selectedAddons: string[];
  conversationId: string;
  replay: Replay;
  isCloseEnabled?: boolean;
  onChangePrompt: (prompt: string) => void;
  onChangeTemperature: (temperature: number) => void;
  onSelectModel: (modelId: string) => void;
  onSelectAssistantSubModel: (modelId: string) => void;
  onApplyAddons: (addonsIds: string[]) => void;
  onChangeAddon: (addonsId: string) => void;
  onClose?: () => void;
}

export const ModelSelectRow = ({ item }: ModelSelectRowProps) => {
  const theme = useAppSelector(UISelectors.selectThemeState);

  return (
    <div className="flex items-center gap-2">
      <ModelIcon
        entity={item}
        entityId={item.id}
        size={18}
        inverted={theme === 'dark'}
      />
      <span>{item.name || item.id}</span>
    </div>
  );
};

export const SettingContainer = ({ children }: SettingContainerProps) => (
  <div className="grow px-3 py-4 md:px-5">{children}</div>
);

export const ConversationSettings = ({
  modelId,
  assistantModelId,
  prompts,
  prompt,
  temperature,
  selectedAddons,
  isCloseEnabled,
  conversationId,
  replay,
  onClose,
  onSelectModel,
  onSelectAssistantSubModel,
  onChangePrompt,
  onChangeTemperature,
  onChangeAddon,
  onApplyAddons,
}: Props) => {
  const { t } = useTranslation('chat');
  const modelsMap = useAppSelector(ModelsSelectors.selectModelsMap);

  const model = useMemo(
    () => (modelId ? modelsMap[modelId] : undefined),
    [modelId, modelsMap],
  );

  const [width, setWidth] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);

  const isNoModelInUserMessages = useMemo(() => {
    return (
      replay.isReplay &&
      replay.replayUserMessagesStack &&
      replay.replayUserMessagesStack.some((message) => !message.model)
    );
  }, [replay]);

  useEffect(() => {
    if (!ref) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      ref.current?.clientWidth && setWidth(ref.current.clientWidth);
    });
    ref.current && resizeObserver.observe(ref.current);

    () => {
      resizeObserver.disconnect();
    };
  }, [ref]);

  return (
    <div
      ref={ref}
      className="flex w-full flex-col gap-[1px] overflow-hidden rounded-b bg-gray-300 dark:bg-gray-900 [&:first-child]:rounded-t"
    >
      <div
        className={classNames(
          'relative h-full w-full gap-[1px] overflow-auto',
          {
            'grid grid-cols-2': width >= 450,
          },
        )}
        data-qa="conversation-settings"
      >
        <div className="shrink overflow-auto bg-gray-200 px-3 py-4 dark:bg-gray-800 md:px-5">
          <ConversationSettingsModel
            conversationId={conversationId}
            replay={replay}
            modelId={model?.id}
            onModelSelect={onSelectModel}
          />
        </div>
        {!replay.replayAsIs ? (
          model ? (
            <div
              className="flex max-h-full shrink flex-col divide-y divide-gray-300 overflow-auto bg-gray-200 dark:divide-gray-900 dark:bg-gray-800"
              data-qa="entity-settings"
            >
              {model.type === 'application' && (
                <SettingContainer>
                  <ModelDescription model={model} />
                </SettingContainer>
              )}
              {model.type === 'assistant' && (
                <SettingContainer>
                  <AssistantSubModelSelector
                    assistantModelId={
                      assistantModelId ?? DEFAULT_ASSISTANT_SUBMODEL.id
                    }
                    onSelectAssistantSubModel={onSelectAssistantSubModel}
                  />
                </SettingContainer>
              )}
              {model.type === 'model' && (
                <SettingContainer>
                  <SystemPrompt
                    maxLength={model.maxLength}
                    prompt={prompt}
                    prompts={prompts}
                    onChangePrompt={onChangePrompt}
                  />
                </SettingContainer>
              )}

              {model.type !== 'application' && (
                <SettingContainer>
                  <TemperatureSlider
                    label={t('Temperature')}
                    onChangeTemperature={onChangeTemperature}
                    temperature={temperature}
                  />
                </SettingContainer>
              )}

              {model.type !== 'application' && (
                <SettingContainer>
                  <Addons
                    preselectedAddonsIds={model.selectedAddons || []}
                    selectedAddonsIds={selectedAddons}
                    onChangeAddon={onChangeAddon}
                    onApplyAddons={onApplyAddons}
                  />
                </SettingContainer>
              )}
            </div>
          ) : (
            <div className="flex justify-center p-3">
              {t('No settings available')}
            </div>
          )
        ) : (
          <ReplayAsIsDescription isModelInMessages={isNoModelInUserMessages} />
        )}
        {isCloseEnabled && (
          <button
            className="absolute right-3 top-3 text-gray-500 hover:text-blue-500"
            onClick={onClose}
          >
            <XMark height={24} width={24} />
          </button>
        )}
      </div>
    </div>
  );
};
