export type EvaluationCriterion = {
  id: string;
  label: string;
  weight: number;
};

export type EvaluationCategory = {
  id: string;
  title: string;
  criteria: EvaluationCriterion[];
};

export const EVALUATOR_EVALUATION_RUBRIC: EvaluationCategory[] = [
  {
    id: "A",
    title: "Academic Performance for student",
    criteria: [
      {
        id: "A.1",
        label:
          "Does the applicant possess sufficient academic background/qualification required for the proposed programme? Eg, a Masters degree for a PhD Programme, a Bachelors for a Masters Programme.",
        weight: 4,
      },
      {
        id: "A.2",
        label:
          "Is the academic discipline relevant to the proposed study/research?",
        weight: 4,
      },
      {
        id: "A.3",
        label:
          "Is there a logical progression in the applicant's academic career?",
        weight: 4,
      },
      {
        id: "A.4",
        label:
          "Is the final bachelor's degree classification competitive? (First Class (5), Second Class Upper (4), Second Class lower (3), third class (2), Pass (1))",
        weight: 8,
      },
      {
        id: "A.5",
        label:
          "Did the applicant perform well in key subjects/courses relevant to the proposed programme?",
        weight: 5,
      },
    ],
  },
  {
    id: "B",
    title: "Academic Publications",
    criteria: [
      {
        id: "B.1",
        label:
          "Is the publication/conference presentation/patent relevant to the proposed study/research?",
        weight: 3,
      },
      {
        id: "B.2",
        label:
          "Is the publication/conference presentation credible? i.e. it is not predatory or discredited.",
        weight: 3,
      },
      {
        id: "B.3",
        label: "Did the applicant lead the research/publication work?",
        weight: 3,
      },
      {
        id: "B.4",
        label: "Does the profile suggest strong research or academic potential?",
        weight: 3,
      },
      {
        id: "B.5",
        label:
          "Is the applicant likely to succeed in a research-intensive environment?",
        weight: 3,
      },
    ],
  },
  {
    id: "C",
    title: "Relevance to SMECC2E",
    criteria: [
      {
        id: "C.1",
        label: "Does the candidate demonstrate understanding of SMECC2E?",
        weight: 5,
      },
      {
        id: "C.2",
        label:
          "Is the proposed area of study/research clearly connected to programme objectives?",
        weight: 5,
      },
      {
        id: "C.3",
        label:
          "Is the proposed host institution a good academic and research/work fit for the applicant?",
        weight: 5,
      },
      {
        id: "C.4",
        label:
          "Is the mobility strategically beneficial? i.e. does it help the applicant gain competences not available at home?",
        weight: 5,
      },
      {
        id: "C.5",
        label:
          "Will the applicant likely contribute to SMECC2E and clean energy objectives in Africa?",
        weight: 5,
      },
    ],
  },
  {
    id: "D",
    title: "Motivation and Personal Statement",
    criteria: [
      {
        id: "D.1",
        label: "Is the motivation statement clear, specific and compelling?",
        weight: 4,
      },
      {
        id: "D.2",
        label:
          "Does the applicant articulate realistic career goals aligned with the scholarship?",
        weight: 4,
      },
      {
        id: "D.3",
        label:
          "Does the applicant explain why the proposed mobility is necessary at this stage?",
        weight: 4,
      },
      {
        id: "D.4",
        label:
          "Is there evidence of commitment to contribute to the home institution/country after mobility?",
        weight: 4,
      },
      {
        id: "D.5",
        label:
          "Does the personal profile demonstrate maturity and readiness for international mobility?",
        weight: 4,
      },
    ],
  },
  {
    id: "E",
    title: "Research / Study Plan",
    criteria: [
      {
        id: "E.1",
        label: "Is the research/study plan clearly structured and feasible?",
        weight: 4,
      },
      {
        id: "E.2",
        label:
          "Are objectives, methodology and expected outcomes well defined?",
        weight: 4,
      },
      {
        id: "E.3",
        label: "Is the plan aligned with the host institution's strengths?",
        weight: 4,
      },
      {
        id: "E.4",
        label:
          "Does the plan demonstrate originality or a meaningful contribution?",
        weight: 4,
      },
      {
        id: "E.5",
        label: "Is the timeline realistic for the proposed mobility period?",
        weight: 4,
      },
    ],
  },
  {
    id: "F",
    title: "Professional and Academic Experience",
    criteria: [
      {
        id: "F.1",
        label:
          "Does the applicant have relevant academic or professional experience?",
        weight: 3,
      },
      {
        id: "F.2",
        label: "Is prior experience aligned with the proposed mobility?",
        weight: 3,
      },
      {
        id: "F.3",
        label:
          "Does the CV demonstrate continuous professional/academic development?",
        weight: 3,
      },
      {
        id: "F.4",
        label:
          "Are skills and competencies adequate for the proposed programme?",
        weight: 3,
      },
      {
        id: "F.5",
        label:
          "Does experience indicate ability to adapt to new academic/work environments?",
        weight: 3,
      },
    ],
  },
  {
    id: "G",
    title: "Language and Communication",
    criteria: [
      {
        id: "G.1",
        label:
          "Does the applicant meet language requirements for the host institution?",
        weight: 3,
      },
      {
        id: "G.2",
        label: "Is written English in the application clear and professional?",
        weight: 3,
      },
      {
        id: "G.3",
        label: "Is language certification provided where required?",
        weight: 3,
      },
      {
        id: "G.4",
        label:
          "Is the applicant likely to communicate effectively during mobility?",
        weight: 3,
      },
    ],
  },
  {
    id: "H",
    title: "References and Institutional Support",
    criteria: [
      {
        id: "H.1",
        label: "Are reference letters from credible and relevant referees?",
        weight: 3,
      },
      {
        id: "H.2",
        label: "Do referees confirm academic/professional ability?",
        weight: 3,
      },
      {
        id: "H.3",
        label:
          "Is there evidence of home institution support where applicable?",
        weight: 3,
      },
      {
        id: "H.4",
        label:
          "Is host institution commitment demonstrated where required?",
        weight: 3,
      },
    ],
  },
  {
    id: "I",
    title: "Overall Merit and Impact",
    criteria: [
      {
        id: "I.1",
        label: "Overall academic and professional merit of the applicant.",
        weight: 5,
      },
      {
        id: "I.2",
        label:
          "Likely impact on the applicant's career and home institution.",
        weight: 5,
      },
      {
        id: "I.3",
        label:
          "Contribution to SMECC2E visibility, networks and alumni community.",
        weight: 5,
      },
    ],
  },
];

export const ASSESSOR_SCORE_MAX = 5;

export function categoryMaxWeight(category: EvaluationCategory): number {
  return category.criteria.reduce((sum, item) => sum + item.weight, 0);
}

export function rubricMaxGrandTotal(): number {
  return EVALUATOR_EVALUATION_RUBRIC.reduce(
    (sum, category) => sum + categoryMaxWeight(category),
    0
  );
}

export function normalizeAssessorScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(ASSESSOR_SCORE_MAX, Math.max(0, Math.round(value)));
}

export function computeWeightedScore(
  assessorScore: number,
  weight: number
): number {
  return (normalizeAssessorScore(assessorScore) / ASSESSOR_SCORE_MAX) * weight;
}

export function computeCategoryTotal(
  category: EvaluationCategory,
  assessorScores: Record<string, number>
): number {
  return category.criteria.reduce(
    (sum, criterion) =>
      sum + computeWeightedScore(assessorScores[criterion.id] ?? 0, criterion.weight),
    0
  );
}

export function computeGrandTotal(
  assessorScores: Record<string, number>
): number {
  return EVALUATOR_EVALUATION_RUBRIC.reduce(
    (sum, category) => sum + computeCategoryTotal(category, assessorScores),
    0
  );
}

export function allRubricCriterionIds(): string[] {
  return EVALUATOR_EVALUATION_RUBRIC.flatMap((category) =>
    category.criteria.map((criterion) => criterion.id)
  );
}
