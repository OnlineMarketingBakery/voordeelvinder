// Which form renders the fields: the step-by-step form (one question at a time, large answer
// cards) or the single-page form (/vergelijken/energie, Figma 193:2095: compact radio rows,
// smaller labels). The field components read it to pick their look; behaviour is the same.
import { createContext, useContext } from 'react';

export type FormLayout = 'steps' | 'page';

export const FormLayoutContext = createContext<FormLayout>('steps');

export function useFormLayout(): FormLayout {
  return useContext(FormLayoutContext);
}
