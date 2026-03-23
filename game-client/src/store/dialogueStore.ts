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
  sceneImages: string[];
  sceneImageLoading: boolean;

  startDialogue: (sessionId: string, npcId: string, npcName: string) => void;
  loadHistory: (messages: DialogueMessage[]) => void;
  addPlayerMessage: (text: string) => void;
  appendStreamText: (chunk: string) => void;
  resetStreamText: () => void;
  completeMessage: (msg: DialogueMessage) => void;
  setStreaming: (streaming: boolean) => void;
  setEmotion: (emotion: Emotion) => void;
  pushSceneImage: (url: string) => void;
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
  sceneImages: [] as string[],
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
      sceneImages: state.sceneImages,
      sceneImageLoading: state.sceneImageLoading,
    })),

  loadHistory: (messages) =>
    set((state) => ({
      messages: [...messages, ...state.messages],
    })),

  addPlayerMessage: (text) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          sessionId: state.sessionId,
          speaker: '你',
          emotion: 'calm' as Emotion,
          text,
          choices: [],
          allowFreeInput: false,
          fateDelta: 0,
          trustDelta: 0,
          isPlayer: true,
        },
      ],
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

  pushSceneImage: (url) =>
    set((state) => ({
      sceneImages: [...state.sceneImages, url],
      sceneImageLoading: false,
    })),

  setSceneImageLoading: (loading) => set({ sceneImageLoading: loading }),
  endDialogue: () => set({ isActive: false }),
  reset: () => set(initialState),
}));
