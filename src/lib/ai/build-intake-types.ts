/** Shared types for build intake / compression pipeline. */

export type BuildIntakeSummary = {
  appPurpose: string;
  targetUsers: string;
  coreScreens: string[];
  visualStyle: string;
  mainDataEntities: string[];
  mustHaveFirstVersionFeatures: string[];
  niceToHaveLaterFeatures: string[];
  complexBackendRequirements: string[];
  unresolvedQuestions: string[];
  estimatedComplexity: number;
  promptTokenEstimate: number;
  compressedTokenEstimate: number;
};
