import { ShmcCaseStudy } from "./ShmcCaseStudy";
import { StudentUnionGuide } from "./StudentUnionGuide";
import { UnlimitedVotersGuide } from "./UnlimitedVotersGuide";

export const POST_CONTENT: Record<string, () => React.JSX.Element> = {
  "state-house-medical-centre-corps-members": ShmcCaseStudy,
  "how-to-run-a-student-union-election-online": StudentUnionGuide,
  "how-to-run-an-election-with-unlimited-voters": UnlimitedVotersGuide,
};
