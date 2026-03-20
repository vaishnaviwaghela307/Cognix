import { useState, useRef } from 'react';

export interface BehavioralMetrics {
  timeTakenPerQuestion: number[];
  delayBeforeFirstInput: number[];
  editCount: number[];
  backspaceCount: number[];
  typingSpeedChanges: number[];
  answerModificationFrequency: number;
}

export interface CognitiveIndicators {
  hesitationIndex: number;
  responseInstabilityScore: number;
  cognitiveFrictionScore: number;
}

export const useCognitiveTracking = () => {
  const [metrics, setMetrics] = useState<BehavioralMetrics>({
    timeTakenPerQuestion: [],
    delayBeforeFirstInput: [],
    editCount: [],
    backspaceCount: [],
    typingSpeedChanges: [],
    answerModificationFrequency: 0,
  });

  const metricsRef = useRef<BehavioralMetrics>({
    timeTakenPerQuestion: [],
    delayBeforeFirstInput: [],
    editCount: [],
    backspaceCount: [],
    typingSpeedChanges: [],
    answerModificationFrequency: 0,
  });

  const currentStartTime = useRef<number>(0);
  const firstInputTime = useRef<number>(0);
  const edits = useRef<number>(0);
  const backspaces = useRef<number>(0);
  const keyPresses = useRef<{ time: number; length: number }[]>([]);
  const hasInputted = useRef<boolean>(false);

  const startQuestion = () => {
    currentStartTime.current = Date.now();
    firstInputTime.current = 0;
    edits.current = 0;
    backspaces.current = 0;
    keyPresses.current = [];
    hasInputted.current = false;
  };

  const recordInput = (text: string) => {
    if (!hasInputted.current) {
      firstInputTime.current = Date.now();
      hasInputted.current = true;
    }

    const now = Date.now();
    const prevLength = keyPresses.current.length > 0 ? keyPresses.current[keyPresses.current.length - 1].length : 0;

    if (text.length < prevLength) {
      backspaces.current += 1;
    }

    edits.current += 1;
    keyPresses.current.push({ time: now, length: text.length });
  };

  const recordAnswerChange = () => {
    metricsRef.current.answerModificationFrequency += 1;
    setMetrics((prev) => ({
      ...prev,
      answerModificationFrequency: prev.answerModificationFrequency + 1,
    }));
  };

  const endQuestion = () => {
    const endTime = Date.now();
    const duration = endTime - currentStartTime.current;
    const delay = firstInputTime.current ? firstInputTime.current - currentStartTime.current : duration;

    // Calculate typing speed changes if there were key presses
    let avgSpeedChange = 0;
    if (keyPresses.current.length > 1) {
      const speeds = [];
      for (let i = 1; i < keyPresses.current.length; i++) {
        const timeDiff = (keyPresses.current[i].time - keyPresses.current[i - 1].time) / 1000; // seconds
        if (timeDiff > 0) {
          speeds.push(1 / timeDiff); // chars per second
        }
      }
      if (speeds.length > 1) {
        let totalChange = 0;
        for (let i = 1; i < speeds.length; i++) {
          totalChange += Math.abs(speeds[i] - speeds[i - 1]);
        }
        avgSpeedChange = totalChange / (speeds.length - 1);
      }
    }

    const newMetrics = {
      timeTakenPerQuestion: [...metricsRef.current.timeTakenPerQuestion, duration],
      delayBeforeFirstInput: [...metricsRef.current.delayBeforeFirstInput, delay],
      editCount: [...metricsRef.current.editCount, edits.current],
      backspaceCount: [...metricsRef.current.backspaceCount, backspaces.current],
      typingSpeedChanges: [...metricsRef.current.typingSpeedChanges, avgSpeedChange],
      answerModificationFrequency: metricsRef.current.answerModificationFrequency,
    };

    metricsRef.current = newMetrics;
    setMetrics(newMetrics);
  };

  const calculateIndicators = (finalMetrics: BehavioralMetrics): CognitiveIndicators => {
    const avgDelay = finalMetrics.delayBeforeFirstInput.reduce((a, b) => a + b, 0) / (finalMetrics.delayBeforeFirstInput.length || 1);
    const avgTime = finalMetrics.timeTakenPerQuestion.reduce((a, b) => a + b, 0) / (finalMetrics.timeTakenPerQuestion.length || 1);
    const totalEdits = finalMetrics.editCount.reduce((a, b) => a + b, 0);
    const totalBackspaces = finalMetrics.backspaceCount.reduce((a, b) => a + b, 0);

    // Hesitation Index: normalized ratio of delay to total time + penalty for edits
    const hesitationIndex = Math.min(10, (avgDelay / (avgTime || 1)) * 5 + (totalEdits / 10));

    // Response Instability Score: based on modification frequency and backspaces
    const responseInstabilityScore = Math.min(10, (finalMetrics.answerModificationFrequency * 2) + (totalBackspaces / 5));

    // Cognitive Friction Score: combined metric
    const cognitiveFrictionScore = Math.min(10, (hesitationIndex + responseInstabilityScore) / 2 + (finalMetrics.typingSpeedChanges.reduce((a, b) => a + b, 0) / (finalMetrics.typingSpeedChanges.length || 1)));

    return {
      hesitationIndex: Number(hesitationIndex.toFixed(2)),
      responseInstabilityScore: Number(responseInstabilityScore.toFixed(2)),
      cognitiveFrictionScore: Number(cognitiveFrictionScore.toFixed(2)),
    };
  };

  const getLatestMetrics = () => metricsRef.current;

  return {
    metrics,
    getLatestMetrics,
    startQuestion,
    recordInput,
    recordAnswerChange,
    endQuestion,
    calculateIndicators,
  };
};
