import { ShmcCaseStudy } from "./ShmcCaseStudy";
import { StudentUnionGuide } from "./StudentUnionGuide";

export const POST_CONTENT: Record<string, () => React.JSX.Element> = {
  "state-house-medical-centre-corps-members": ShmcCaseStudy,
  "how-to-run-a-student-union-election-online": StudentUnionGuide,
};
