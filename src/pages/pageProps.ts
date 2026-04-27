import type { MockAppData } from "../mocks/mockAppData";
import type { Screen } from "../types";

export type PageProps = {
  mock: MockAppData;
  navigate: (screen: Screen) => void;
};
