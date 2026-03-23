import { create } from 'zustand';
import type { DialogueMessage, Emotion, DialogueChoice } from '../types';

interface DialogueState {
  sessionId: string;
  npcId: string;
  npcName: string;
  currentEmotion: Emotion;
  messages: DialogueMessage[];
  currentText: string;
  currentChoices: DialogueChoice[];
  allowFreeInput: boolean;
  isStreaming: boolean;
  isActive: boolean;
  sceneImageUrl: string;
  sceneImageLoading: boolean;

  startDialogue: (sessionId: string, npcId: string, npcName: string) => void;
  appendStreamText: (chunk: string) => void;
  resetStreamText: () => void;
  completeMessage: (msg: DialogueMessage) => void;
  setStreaming: (streaming: boolean) => void;
  setEmotion: (emotion: Emotion) => void;
  setSceneImage: (url: string) => void;
  setSceneImageLoading: (loading: boolean) => void;
  endDialogue: () => void;
  reset: () => void;
}

const initialState = {
  sessionId: '',
  npcId: '',
  npcName: '',
  currentEmotion: 'calm' as Emotion,
  messages: [] as DialogueMessage[],
  currentText: '',
  currentChoices: [] as DialogueChoice[],
  allowFreeInput: false,
  isStreaming: false,
  isActive: false,
  sceneImageUrl: '',
  sceneImageLoading: false,
};

export const useDialogueStore = create<DialogueState>((set) => ({
  ...initialState,

  startDialogue: (sessionId, npcId, npcName) =>
    set((state) => ({
      ...initialState,
      sessionId,
      npcId,
      npcName,
      isActive: true,
      // 保留场景图状态（图片请求与对话并行）
      sceneImageUrl: state.sceneImageUrl,
      sceneImageLoading: state.sceneImageLoading,
    })),

  appendStreamText: (chunk) =>
    set((state) => ({ currentText: state.currentText + chunk })),
  resetStreamText: () => set({ currentText: '' }),

  completeMessage: (msg) =>
    set((state) => ({
      messages: [...state.messages, msg],
      currentText: '',
      currentChoices: msg.choices,
      allowFreeInput: msg.allowFreeInput,
      currentEmotion: msg.emotion,
      isStreaming: false,
    })),

  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setEmotion: (emotion) => set({ currentEmotion: emotion }),
  setSceneImage: (url) => set({ sceneImageUrl: url, sceneImageLoading: false }),
  setSceneImageLoading: (loading) => set({ sceneImageLoading: loading }),
  endDialogue: () => set({ isActive: false }),
  reset: () => set(initialState),
}));
