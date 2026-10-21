import type {WorkbenchMode} from '@/lib/tanga-voice-command';

/** One question and one evidence-based takeaway per chapter. */
export const TANGA_STORY: Record<WorkbenchMode, {question: string; takeaway: string; seconds: number}> = {
  project: {question: 'What is Tanga?', takeaway: 'A graphite project in Tanzania, explored through its landscape, drilling and reported estimate.', seconds: 16},
  tanzania: {question: 'Where does the project sit?', takeaway: 'Move from Tanzania to the Tanga region and its coastal setting.', seconds: 16},
  ranking: {question: 'How does Tanga compare?', takeaway: 'Use the same contained-graphite measure across a dated published project benchmark.', seconds: 26},
  work_completed: {question: 'What work stands behind it?', takeaway: 'Survey, drilling, estimation and testwork each add a distinct piece of evidence.', seconds: 22},
  topography: {question: 'What does the ground tell us?', takeaway: 'The surveyed ridges and valleys provide the surface reference for the project story.', seconds: 20},
  drillholes: {question: 'Where has the ground been sampled?', takeaway: 'Recorded drill intervals are observations; the spaces between holes require interpretation.', seconds: 28},
  subsurface: {question: 'How are the observations connected?', takeaway: 'The geological model connects sampled rock units into an interpreted framework.', seconds: 26},
  resource: {question: 'What does the estimate add?', takeaway: 'The reported estimate describes scale and grade; the blocks show their spatial distribution.', seconds: 28},
  mine_planning: {question: 'How could the site fit together?', takeaway: 'Follow the uphill feed station and proposed lowland processing concept from the 2023 logistics study.', seconds: 34},
  metallurgy: {question: 'What did the testwork show?', takeaway: 'Concentrate carbon, recovery and flake size answer different processing questions.', seconds: 24},
  accessibility: {question: 'How does the site connect outward?', takeaway: 'Road, port, rail and power locations frame the next infrastructure questions.', seconds: 16},
  comparison: {question: 'What should the next study resolve?', takeaway: 'Reconcile the evidence, strengthen study confidence and test development constraints.', seconds: 14},
};

export const EXECUTIVE_STORY_SECONDS = Object.values(TANGA_STORY).reduce((sum, chapter) => sum + chapter.seconds, 0);
