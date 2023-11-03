import { IconPlayerStop, IconSend } from '@tabler/icons-react';
import {
  ForwardedRef,
  KeyboardEvent,
  MutableRefObject,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useTranslation } from 'next-i18next';

import { isMobile } from '@/src/utils/app/mobile';

import { Message } from '@/src/types/chat';
import { Prompt } from '@/src/types/prompt';

import { ConversationsSelectors } from '@/src/store/conversations/conversations.reducers';
import { useAppSelector } from '@/src/store/hooks';
import { ModelsSelectors } from '@/src/store/models/models.reducers';
import { PromptsSelectors } from '@/src/store/prompts/prompts.reducers';
import { SettingsSelectors } from '@/src/store/settings/settings.reducers';

import RefreshCWAlt from '../../../public/images/icons/refresh-cw-alt.svg';
import { FooterMessage } from './FooterMessage';
import { PromptList } from './PromptList';
import { ScrollDownButton } from './ScrollDownButton';
import { VariableModal } from './VariableModal';

interface Props {
  onSend: (message: Message) => void;
  onRegenerate: () => void;
  onScrollDownClick: () => void;
  onStopConversation: () => void;
  maxLength: number;
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>;
  showScrollDownButton: boolean;
  isMessagesPresented: boolean;
}

export const ChatInput = forwardRef(
  (
    {
      onSend,
      onRegenerate,
      onScrollDownClick,
      onStopConversation,
      maxLength,
      textareaRef,
      showScrollDownButton,
      isMessagesPresented,
    }: Props,
    ref: ForwardedRef<HTMLDivElement>,
  ) => {
    const { t } = useTranslation('chat');

    const [content, setContent] = useState<string>();
    const [isTyping, setIsTyping] = useState<boolean>(false);
    const [showPromptList, setShowPromptList] = useState(false);
    const [activePromptIndex, setActivePromptIndex] = useState(0);
    const [promptInputValue, setPromptInputValue] = useState('');
    const [variables, setVariables] = useState<string[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [showPluginSelect, setShowPluginSelect] = useState(false);
    const isModelsLoading = useAppSelector(
      ModelsSelectors.selectModelsIsLoading,
    );
    const prompts = useAppSelector(PromptsSelectors.selectPrompts);
    const messageIsStreaming = useAppSelector(
      ConversationsSelectors.selectIsConversationsStreaming,
    );
    const isIframe = useAppSelector(SettingsSelectors.selectIsIframe);
    const footerHtmlMessage = useAppSelector(
      SettingsSelectors.selectFooterHtmlMessage,
    );
    const enabledFeatures = useAppSelector(
      SettingsSelectors.selectEnabledFeatures,
    );

    const promptListRef = useRef<HTMLUListElement | null>(null);

    const [filteredPrompts, setFilteredPrompts] = useState(() =>
      prompts.filter((prompt) =>
        prompt.name.toLowerCase().includes(promptInputValue.toLowerCase()),
      ),
    );

    useEffect(() => {
      setFilteredPrompts(
        prompts.filter((prompt) =>
          prompt.name.toLowerCase().includes(promptInputValue.toLowerCase()),
        ),
      );
    }, [prompts, promptInputValue]);

    const updatePromptListVisibility = useCallback((text: string) => {
      const match = text.match(/\/\w*$/);

      if (match) {
        setShowPromptList(true);
        setPromptInputValue(match[0].slice(1));
      } else {
        setShowPromptList(false);
        setPromptInputValue('');
      }
    }, []);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;

        if (maxLength && value.length > maxLength) {
          alert(
            t(
              `Message limit is {{maxLength}} characters. You have entered {{valueLength}} characters.`,
              { maxLength, valueLength: value.length },
            ),
          );
          return;
        }

        setContent(value);
        updatePromptListVisibility(value);
      },
      [maxLength, t, updatePromptListVisibility],
    );

    const handleSend = useCallback(() => {
      if (messageIsStreaming) {
        return;
      }

      if (!content) {
        alert(t('Please enter a message'));
        return;
      }

      onSend({ role: 'user', content });
      setContent('');

      if (window.innerWidth < 640 && textareaRef && textareaRef.current) {
        textareaRef.current.blur();
      }
    }, [content, messageIsStreaming, onSend, t, textareaRef]);

    const parseVariables = useCallback((content: string) => {
      const regex = /{{(.*?)}}/g;
      const foundVariables = [];
      let match;

      while ((match = regex.exec(content)) !== null) {
        foundVariables.push(match[1]);
      }

      return foundVariables;
    }, []);

    const handlePromptSelect = useCallback(
      (prompt: Prompt) => {
        if (!prompt.content) {
          return;
        }

        const parsedVariables = parseVariables(prompt.content);
        setVariables(parsedVariables);

        if (parsedVariables.length > 0) {
          setIsModalVisible(true);
        } else {
          setContent((prevContent) => {
            const updatedContent = prevContent?.replace(
              /\/\w*$/,
              prompt.content as string,
            );
            return updatedContent;
          });
          updatePromptListVisibility(prompt.content);
        }
      },
      [parseVariables, updatePromptListVisibility],
    );

    const handleInitModal = useCallback(() => {
      const selectedPrompt = filteredPrompts[activePromptIndex];
      if (selectedPrompt && !!selectedPrompt.content) {
        setContent((prevContent) => {
          const newContent = prevContent?.replace(
            /\/\w*$/,
            selectedPrompt.content as string,
          );
          return newContent;
        });
        handlePromptSelect(selectedPrompt);
      }
      setShowPromptList(false);
    }, [activePromptIndex, filteredPrompts, handlePromptSelect]);

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (showPromptList) {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActivePromptIndex((prevIndex) =>
              prevIndex < prompts.length - 1 ? prevIndex + 1 : prevIndex,
            );
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActivePromptIndex((prevIndex) =>
              prevIndex > 0 ? prevIndex - 1 : prevIndex,
            );
          } else if (e.key === 'Tab') {
            e.preventDefault();
            setActivePromptIndex((prevIndex) =>
              prevIndex < prompts.length - 1 ? prevIndex + 1 : 0,
            );
          } else if (e.key === 'Enter') {
            e.preventDefault();
            handleInitModal();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setShowPromptList(false);
          } else {
            setActivePromptIndex(0);
          }
        } else if (
          e.key === 'Enter' &&
          !isTyping &&
          !isMobile() &&
          !e.shiftKey
        ) {
          e.preventDefault();
          handleSend();
        } else if (e.key === '/' && e.metaKey) {
          e.preventDefault();
          setShowPluginSelect(!showPluginSelect);
        }
      },
      [
        handleInitModal,
        handleSend,
        isTyping,
        prompts.length,
        showPluginSelect,
        showPromptList,
      ],
    );

    const handleSubmit = useCallback(
      (updatedVariables: string[]) => {
        const newContent = content?.replace(/{{(.*?)}}/g, (match, variable) => {
          const index = variables.indexOf(variable);
          return updatedVariables[index];
        });

        setContent(newContent);

        if (textareaRef && textareaRef.current) {
          textareaRef.current.focus();
        }
      },
      [content, textareaRef, variables],
    );

    useEffect(() => {
      if (promptListRef.current) {
        promptListRef.current.scrollTop = activePromptIndex * 30;
      }
    }, [activePromptIndex]);

    useEffect(() => {
      if (textareaRef && textareaRef.current) {
        textareaRef.current.style.height = 'inherit';
        textareaRef.current.style.height = `${textareaRef.current?.scrollHeight}px`;
        textareaRef.current.style.overflow = `${
          textareaRef?.current?.scrollHeight > 400 ? 'auto' : 'hidden'
        }`;
      }
    }, [content, textareaRef]);

    useEffect(() => {
      const handleOutsideClick = (e: MouseEvent) => {
        if (
          promptListRef.current &&
          !promptListRef.current.contains(e.target as Node)
        ) {
          setShowPromptList(false);
        }
      };

      window.addEventListener('click', handleOutsideClick);

      return () => {
        window.removeEventListener('click', handleOutsideClick);
      };
    }, []);

    return (
      <div
        ref={ref}
        className="absolute bottom-0 left-0 w-full border-transparent bg-gradient-to-b from-transparent via-gray-300 to-gray-300 pt-6 dark:via-gray-900 dark:to-gray-900 md:pt-2"
      >
        <div className="relative ">
          {messageIsStreaming && (
            <button
              className="absolute inset-x-0 -top-14 mx-auto mb-3 flex w-fit items-center gap-3 rounded border border-gray-400 bg-gray-200 p-3 hover:bg-gray-400 dark:border-gray-600 dark:bg-gray-800 hover:dark:bg-gray-600"
              onClick={onStopConversation}
              data-qa="stop-generating"
            >
              <IconPlayerStop
                size={18}
                className="text-gray-500"
                strokeWidth="1.5"
              />{' '}
              {t('Stop generating')}
            </button>
          )}

          {!messageIsStreaming && isMessagesPresented && (
            <button
              className="absolute inset-x-0 -top-14 mx-auto mb-3 flex w-fit items-center gap-3 rounded border border-gray-400 bg-gray-200 p-3 hover:bg-gray-400 dark:border-gray-600 dark:bg-gray-800 hover:dark:bg-gray-600"
              onClick={onRegenerate}
              data-qa="regenerate"
            >
              <span className="text-gray-500">
                <RefreshCWAlt width={18} height={18} />
              </span>
              {t('Regenerate response')}
            </button>
          )}
        </div>

        <div className="mx-2 mb-2 flex flex-row gap-3 md:mx-4 md:mb-0  md:last:mb-6 lg:mx-auto lg:max-w-3xl">
          <div className="relative flex w-full grow flex-col" data-qa="message">
            <textarea
              ref={textareaRef}
              className="m-0 min-h-[40px] w-full resize-none rounded border border-transparent bg-gray-100 py-3 pl-4 pr-10 outline-none placeholder:text-gray-500 focus-visible:border-blue-500 dark:bg-gray-700"
              style={{
                resize: 'none',
                bottom: `${textareaRef?.current?.scrollHeight}px`,
                maxHeight: '400px',
                overflow: `${
                  textareaRef.current && textareaRef.current.scrollHeight > 400
                    ? 'auto'
                    : 'hidden'
                }`,
              }}
              placeholder={
                isIframe
                  ? t('Type a message') || ''
                  : t('Type a message or type "/" to select a prompt...') || ''
              }
              value={content}
              rows={1}
              onCompositionStart={() => setIsTyping(true)}
              onCompositionEnd={() => setIsTyping(false)}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
            />

            <button
              className="absolute right-4 top-2.5 rounded"
              onClick={handleSend}
              disabled={messageIsStreaming || isModelsLoading}
            >
              {messageIsStreaming || isModelsLoading ? (
                <div
                  className="h-5 w-5 animate-spin rounded-full border-t-2 border-gray-500"
                  data-qa="message-input-spinner"
                ></div>
              ) : (
                <span className="hover:text-blue-500">
                  <IconSend size={24} stroke="1.5" />
                </span>
              )}
            </button>

            {showScrollDownButton && (
              <ScrollDownButton onScrollDownClick={onScrollDownClick} />
            )}

            {showPromptList && filteredPrompts.length > 0 && (
              <div className="absolute bottom-12 w-full">
                <PromptList
                  activePromptIndex={activePromptIndex}
                  prompts={filteredPrompts}
                  onSelect={handleInitModal}
                  onMouseOver={setActivePromptIndex}
                  promptListRef={promptListRef}
                />
              </div>
            )}

            {isModalVisible && (
              <VariableModal
                prompt={filteredPrompts[activePromptIndex]}
                variables={variables}
                onSubmit={handleSubmit}
                onClose={() => setIsModalVisible(false)}
              />
            )}
          </div>
        </div>

        <div className="p-5 max-md:hidden">
          <FooterMessage
            isShowFooter={enabledFeatures.has('footer')}
            isShowRequestApiKey={enabledFeatures.has('request-api-key')}
            isShowReportAnIssue={enabledFeatures.has('report-an-issue')}
            footerHtmlMessage={footerHtmlMessage}
          />
        </div>
      </div>
    );
  },
);

ChatInput.displayName = 'ChatInput';
