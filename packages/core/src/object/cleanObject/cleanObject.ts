export const cleanObject = (input: Record<string, any>) => {
  Object.keys(input).forEach((key: string) => {
    delete input[key];
  });
};
