export function buildDaySummaryMessage(
  deviation: "same" | "less" | "more",
  caloriesDelta: number,
  notes?: string,
): string {
  const normalizedNotes = (notes ?? "").toLowerCase();
  const hasOvereatingSignal =
    normalizedNotes.includes("переел") ||
    normalizedNotes.includes("переела") ||
    normalizedNotes.includes("сорвал") ||
    normalizedNotes.includes("сорвалась") ||
    normalizedNotes.includes("много") ||
    normalizedNotes.includes("пицца") ||
    normalizedNotes.includes("ролл") ||
    normalizedNotes.includes("бургер") ||
    normalizedNotes.includes("фастфуд") ||
    normalizedNotes.includes("шаурм");
  if (hasOvereatingSignal) {
    return "Похоже, день получился плотнее, чем планировалось. Это не откат назад. Завтра просто возвращаемся к обычному режиму — без наказаний и попыток всё компенсировать.";
  }
  const hasSweetsSignal =
    normalizedNotes.includes("сладк") ||
    normalizedNotes.includes("шоколад") ||
    normalizedNotes.includes("печенье") ||
    normalizedNotes.includes("конфет") ||
    normalizedNotes.includes("сахар");
  if (hasSweetsSignal) {
    return "Похоже, сегодня тянуло на сладкое. Часто это связано с усталостью или нерегулярным питанием. Это нормально — давайте завтра попробуем сделать день более ровным.";
  }
  const hasEveningSnackingSignal =
    normalizedNotes.includes("вечером") ||
    normalizedNotes.includes("вечер") ||
    normalizedNotes.includes("ночью") ||
    normalizedNotes.includes("ночной") ||
    normalizedNotes.includes("перед сном") ||
    normalizedNotes.includes("перекус") ||
    normalizedNotes.includes("перекусы") ||
    normalizedNotes.includes("доел") ||
    normalizedNotes.includes("доела") ||
    normalizedNotes.includes("дожор");
  if (hasEveningSnackingSignal) {
    return "Похоже, вечером было сложнее удержать режим. Такое часто бывает после напряжённого дня или нерегулярного питания. Завтра попробуем сделать ужин спокойнее и добавить понятный перекус заранее.";
  }
  const hasFatigueSignal =
    normalizedNotes.includes("устал") ||
    normalizedNotes.includes("устала") ||
    normalizedNotes.includes("нет сил") ||
    normalizedNotes.includes("не высп") ||
    normalizedNotes.includes("сон") ||
    normalizedNotes.includes("стресс") ||
    normalizedNotes.includes("нервы") ||
    normalizedNotes.includes("хаос") ||
    normalizedNotes.includes("завал") ||
    normalizedNotes.includes("не успел") ||
    normalizedNotes.includes("не успела");
  if (hasFatigueSignal) {
    return "Похоже, день был непростым: усталость, стресс или нехватка сна часто влияют на питание. Давайте завтра сделаем не идеальный, а просто более спокойный день.";
  }
  const hasNoCookingTimeSignal =
    normalizedNotes.includes("не успел приготовить") ||
    normalizedNotes.includes("не успела приготовить") ||
    normalizedNotes.includes("не готовил") ||
    normalizedNotes.includes("не готовила") ||
    normalizedNotes.includes("ел что было") ||
    normalizedNotes.includes("ела что было") ||
    normalizedNotes.includes("на ходу") ||
    normalizedNotes.includes("взял что было") ||
    normalizedNotes.includes("взяла что было") ||
    normalizedNotes.includes("быстро перекусил") ||
    normalizedNotes.includes("быстро перекусила");
  if (hasNoCookingTimeSignal) {
    return "Похоже, сегодня не было времени нормально поесть. Это обычная ситуация. Давайте завтра сделаем максимально простой и понятный вариант — без сложной готовки.";
  }
  if (deviation === "less") {
    return "Сегодня питания могло быть меньше, чем нужно. Завтра лучше вернуться к более ровному режиму — без жёсткости к себе.";
  }
  if (deviation === "more") {
    return "Сегодня могло быть больше еды, чем планировалось. Это не провал — просто завтра возвращаемся к обычному мягкому режиму.";
  }
  if (deviation === "same") {
    return "Сегодня получилось довольно стабильно. Такие спокойные дни и создают основу результата.";
  }
  if (caloriesDelta <= -200) {
    return "Сегодня питания могло быть меньше, чем нужно. Завтра лучше вернуться к более ровному режиму — без жёсткости к себе.";
  }
  if (caloriesDelta >= 200) {
    return "Сегодня могло быть больше еды, чем планировалось. Это не провал — просто завтра возвращаемся к обычному мягкому режиму.";
  }
  return "Сегодня получилось довольно стабильно. Такие спокойные дни и создают основу результата.";
}

export function buildTomorrowSuggestion(
  deviation: "same" | "less" | "more",
  caloriesDelta: number,
  notes?: string,
): string {
  const normalizedNotes = (notes ?? "").toLowerCase();
  const hasOvereatingSignal =
    normalizedNotes.includes("переел") ||
    normalizedNotes.includes("переела") ||
    normalizedNotes.includes("сорвал") ||
    normalizedNotes.includes("сорвалась") ||
    normalizedNotes.includes("много") ||
    normalizedNotes.includes("пицца") ||
    normalizedNotes.includes("ролл") ||
    normalizedNotes.includes("бургер") ||
    normalizedNotes.includes("фастфуд") ||
    normalizedNotes.includes("шаурм");
  if (hasOvereatingSignal) {
    return "Завтра просто вернитесь к обычному плану — без разгрузок и попыток компенсировать.";
  }
  const hasSweetsSignal =
    normalizedNotes.includes("сладк") ||
    normalizedNotes.includes("шоколад") ||
    normalizedNotes.includes("печенье") ||
    normalizedNotes.includes("конфет") ||
    normalizedNotes.includes("сахар");
  if (hasSweetsSignal) {
    return "Завтра можно заранее добавить понятный перекус днём, чтобы вечером было спокойнее.";
  }
  const hasEveningSnackingSignal =
    normalizedNotes.includes("вечером") ||
    normalizedNotes.includes("вечер") ||
    normalizedNotes.includes("ночью") ||
    normalizedNotes.includes("ночной") ||
    normalizedNotes.includes("перед сном") ||
    normalizedNotes.includes("перекус") ||
    normalizedNotes.includes("перекусы") ||
    normalizedNotes.includes("доел") ||
    normalizedNotes.includes("доела") ||
    normalizedNotes.includes("дожор");
  if (hasEveningSnackingSignal) {
    return "Завтра попробуйте сделать ужин более спокойным и заранее оставить лёгкий перекус.";
  }
  const hasFatigueSignal =
    normalizedNotes.includes("устал") ||
    normalizedNotes.includes("устала") ||
    normalizedNotes.includes("нет сил") ||
    normalizedNotes.includes("не высп") ||
    normalizedNotes.includes("сон") ||
    normalizedNotes.includes("стресс") ||
    normalizedNotes.includes("нервы") ||
    normalizedNotes.includes("хаос") ||
    normalizedNotes.includes("завал") ||
    normalizedNotes.includes("не успел") ||
    normalizedNotes.includes("не успела");
  if (hasFatigueSignal) {
    return "Завтра выберите самый простой вариант из плана, без стремления сделать всё идеально.";
  }
  const hasNoCookingTimeSignal =
    normalizedNotes.includes("не успел приготовить") ||
    normalizedNotes.includes("не успела приготовить") ||
    normalizedNotes.includes("не готовил") ||
    normalizedNotes.includes("не готовила") ||
    normalizedNotes.includes("ел что было") ||
    normalizedNotes.includes("ела что было") ||
    normalizedNotes.includes("на ходу") ||
    normalizedNotes.includes("взял что было") ||
    normalizedNotes.includes("взяла что было") ||
    normalizedNotes.includes("быстро перекусил") ||
    normalizedNotes.includes("быстро перекусила");
  if (hasNoCookingTimeSignal) {
    return "Завтра можно выбрать самый быстрый вариант еды и не усложнять готовку.";
  }
  if (deviation === "less" || caloriesDelta <= -200) {
    return "Завтра постарайтесь не пропускать основные приёмы пищи.";
  }
  if (deviation === "more" || caloriesDelta >= 200) {
    return "Завтра вернитесь к обычному режиму и не пытайтесь себя наказывать.";
  }
  return "Завтра продолжайте в том же спокойном темпе.";
}
