export type MoonieTextResponse = {
  type: 'text';
  content: string;
};

export type MoonieOption = {
  label: string;
  value: string;
  action: string;
};

export type MoonieOptionsResponse = {
  type: 'options';
  message: string;
  options: MoonieOption[];
};

export type MoonieResponse = MoonieTextResponse | MoonieOptionsResponse;
