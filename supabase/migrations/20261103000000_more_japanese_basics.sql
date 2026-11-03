-- Add lessons without changing existing IDs or progress.
insert into public.lessons (id, course_id, title, position, content, published)
select '7aa2de65-1fdc-4e34-90d2-a86cbd3266e6'::uuid, id, 'A third hiragana sound', 4,
'{"subtitle":"Meet the sound u","character":"う","sound":"u (oo)","description":"The hiragana う represents a short u sound. It is similar to oo in food, but Japanese speakers usually keep their lips less rounded.","question":"What sound does this hiragana character make?","answers":["A (ah)","I (ee)","U (oo)","E (eh)"],"correct":2}'::jsonb, true
from public.courses where slug = 'japanese-beginner';
insert into public.lessons (id, course_id, title, position, content, published)
select '83d2d709-ed9f-409b-bc7d-d9965f542c32'::uuid, id, 'Say thank you', 5,
'{"subtitle":"A useful everyday phrase","character":"ありがとう","sound":"arigatou","description":"ありがとう is a casual way to say thank you. In more polite situations, say ありがとうございます (arigatou gozaimasu).","question":"What does ありがとう mean?","answers":["Hello","Thank you","Goodbye","Good night"],"correct":1}'::jsonb, true
from public.courses where slug = 'japanese-beginner';
