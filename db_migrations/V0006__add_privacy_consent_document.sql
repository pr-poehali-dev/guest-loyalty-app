UPDATE t_p70437429_guest_loyalty_app.documents SET is_privacy_policy = FALSE WHERE is_privacy_policy = TRUE;

INSERT INTO t_p70437429_guest_loyalty_app.documents (title, file_name, url, is_privacy_policy)
VALUES (
  'Согласие на обработку персональных данных',
  'Согласие на обработку ПД_Фридом виладж.docx',
  'https://cdn.poehali.dev/projects/1c0a4e35-bc68-4a24-b157-6e54c5e66aa3/bucket/4ad6de0b-b3ca-4ea3-8c5a-aad0ff1eb510.docx',
  TRUE
);