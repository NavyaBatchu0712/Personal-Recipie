const STORAGE_KEY = "fancyRecipeStudio.recipes.v2";
const PROFILE_KEY = "fancyRecipeStudio.profile.v1";
const QUESTIONS_KEY = "fancyRecipeStudio.questions.v1";

let recipes = loadArray(STORAGE_KEY);
let questions = loadArray(QUESTIONS_KEY);
let profile = loadProfile();
let selectedId = "";
let currentPage = 1;
const RECIPES_PER_PAGE = 8;

const siteTitle = document.querySelector("#siteTitle");
const recipeBoard = document.querySelector("#recipeBoard");
const detailPanel = document.querySelector("#detailPanel");
const searchInput = document.querySelector("#searchInput");
const categoryFilter = document.querySelector("#categoryFilter");
const recipeDialog = document.querySelector("#recipeDialog");
const recipeForm = document.querySelector("#recipeForm");
const formTitle = document.querySelector("#formTitle");
const imageInput = document.querySelector("#imageInput");
const imagePreview = document.querySelector("#imagePreview");
const importInput = document.querySelector("#importInput");
const profileDialog = document.querySelector("#profileDialog");
const profileForm = document.querySelector("#profileForm");
const questionDialog = document.querySelector("#questionDialog");
const questionForm = document.querySelector("#questionForm");
const questionList = document.querySelector("#questionList");
const installBtn = document.querySelector("#installBtn");
const installDialog = document.querySelector("#installDialog");
const shareLinkInput = document.querySelector("#shareLinkInput");

document.querySelector("#addRecipeBtn").addEventListener("click", () => openRecipeForm());
document.querySelector("#editRecipeBtn").addEventListener("click", editSelectedRecipe);
document.querySelector("#deleteRecipeBtn").addEventListener("click", deleteSelectedRecipe);
document.querySelector("#exportBtn").addEventListener("click", exportRecipes);
document.querySelector("#importBtn").addEventListener("click", () => importInput.click());
document.querySelector("#closeDialogBtn").addEventListener("click", closeRecipeForm);
document.querySelector("#cancelBtn").addEventListener("click", closeRecipeForm);
document.querySelector("#closeProfileBtn").addEventListener("click", () => profileDialog.close());
document.querySelector("#cancelProfileBtn").addEventListener("click", () => profileDialog.close());
document.querySelector("#closeQuestionBtn").addEventListener("click", () => questionDialog.close());
document.querySelector("#cancelQuestionBtn").addEventListener("click", () => questionDialog.close());
document.querySelector("#closeInstallBtn").addEventListener("click", () => installDialog.close());
document.querySelector("#copyLinkBtn").addEventListener("click", copyShareLink);

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => {
    setActiveNav(button.dataset.view);
    if (button.dataset.view === "profile") openProfile();
    if (button.dataset.view === "questions") openQuestions();
  });
});

searchInput.addEventListener("input", () => {
  currentPage = 1;
  render();
});
categoryFilter.addEventListener("change", () => {
  currentPage = 1;
  render();
});
recipeForm.addEventListener("submit", saveRecipe);
profileForm.addEventListener("submit", saveProfile);
questionForm.addEventListener("submit", saveQuestion);
imageInput.addEventListener("change", previewImage);
importInput.addEventListener("change", importRecipes);
installBtn.addEventListener("click", installApp);

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
});

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("service-worker.js");
}

renderProfile();
render();

function loadArray(key) {
  const saved = localStorage.getItem(key);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadProfile() {
  const fallback = {
    title: "My Recipes",
    email: ""
  };
  const saved = localStorage.getItem(PROFILE_KEY);
  if (!saved) return fallback;
  try {
    return { ...fallback, ...JSON.parse(saved) };
  } catch {
    return fallback;
  }
}

function persistRecipes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
}

function persistProfile() {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function persistQuestions() {
  localStorage.setItem(QUESTIONS_KEY, JSON.stringify(questions));
}

function render() {
  renderFilters();
  const visible = filteredRecipes();
  renderRecipeBoard(visible);
  if (selectedId && !recipes.some((recipe) => recipe.id === selectedId)) selectedId = "";
  renderDetail();
}

function renderProfile() {
  siteTitle.textContent = profile.title;
  document.title = profile.title;
}

function renderFilters() {
  const categories = [...new Set(recipes.map((recipe) => recipe.category).filter(Boolean))].sort();
  const current = categoryFilter.value || "all";
  categoryFilter.innerHTML = `<option value="all">All categories</option>${categories
    .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    .join("")}`;
  categoryFilter.value = categories.includes(current) ? current : "all";
}

function filteredRecipes() {
  const term = searchInput.value.trim().toLowerCase();
  const category = categoryFilter.value;

  return recipes.filter((recipe) => {
    const haystack = [
      recipe.title,
      recipe.category,
      recipe.time,
      recipe.difficulty,
      recipe.kidRating,
      recipe.video,
      recipe.notes,
      ...recipe.tags,
      ...recipe.ingredients,
      ...recipe.steps
    ]
      .join(" ")
      .toLowerCase();
    return (!term || haystack.includes(term)) && (category === "all" || recipe.category === category);
  });
}

function renderRecipeBoard(visible) {
  if (!recipes.length) {
    recipeBoard.innerHTML = `
      <div class="empty-state">
        <p class="eyebrow">No starter recipes</p>
        <h3>Your recipe wall is ready.</h3>
        <p>Add your first recipe from the side menu. Your title, photos, video links, ingredients, and steps will all be editable.</p>
        <button class="primary-btn" type="button" id="emptyAddBtn">Add First Recipe</button>
      </div>
    `;
    document.querySelector("#emptyAddBtn").addEventListener("click", () => openRecipeForm());
    return;
  }

  if (!visible.length) {
    recipeBoard.innerHTML = `<div class="empty-state"><h3>No matching recipes.</h3><p>Try a different search or category.</p></div>`;
    return;
  }

  const pageCount = Math.max(1, Math.ceil(visible.length / RECIPES_PER_PAGE));
  currentPage = Math.min(currentPage, pageCount);
  const pageStart = (currentPage - 1) * RECIPES_PER_PAGE;
  const pageRecipes = visible.slice(pageStart, pageStart + RECIPES_PER_PAGE);
  const pager = pageCount > 1
    ? `
      <div class="pager">
        <button class="secondary-btn" type="button" id="prevPageBtn" ${currentPage === 1 ? "disabled" : ""}>Previous</button>
        <span class="page-count">Page ${currentPage} of ${pageCount} • ${visible.length} recipes</span>
        <button class="secondary-btn" type="button" id="nextPageBtn" ${currentPage === pageCount ? "disabled" : ""}>Next</button>
      </div>
    `
    : `<div class="pager single-page"><span class="page-count">${visible.length} recipe${visible.length === 1 ? "" : "s"}</span></div>`;

  recipeBoard.innerHTML = `
    <div class="icon-gallery">
      ${pageRecipes
    .map((recipe) => {
      const image = recipe.image
        ? `<img class="recipe-icon-image" src="${recipe.image}" alt="${escapeHtml(recipe.title)}">`
        : `<div class="recipe-icon-image" aria-hidden="true"></div>`;
      return `
        <button class="recipe-card ${recipe.id === selectedId ? "active" : ""}" type="button" data-id="${recipe.id}">
          <span class="recipe-icon-wrap">${image}</span>
          <strong class="card-title">${escapeHtml(recipe.title)}</strong>
        </button>
      `;
    })
    .join("")}
    </div>
    ${pager}
  `;

  document.querySelectorAll(".recipe-card").forEach((card) => {
    card.addEventListener("click", () => {
      selectedId = card.dataset.id;
      render();
      detailPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  document.querySelector("#prevPageBtn")?.addEventListener("click", () => {
    currentPage -= 1;
    selectedId = "";
    render();
  });

  document.querySelector("#nextPageBtn")?.addEventListener("click", () => {
    currentPage += 1;
    selectedId = "";
    render();
  });
}

function renderDetail() {
  const recipe = recipes.find((item) => item.id === selectedId);
  if (!recipe) {
    detailPanel.classList.remove("has-recipe");
    detailPanel.innerHTML = "";
    return;
  }

  detailPanel.classList.add("has-recipe");
  const image = recipe.image
    ? `<img class="hero-image" src="${recipe.image}" alt="${escapeHtml(recipe.title)}">`
    : `<div class="hero-image" aria-hidden="true"></div>`;
  const video = recipe.video
    ? `<p><a class="video-link" href="${escapeAttribute(recipe.video)}" target="_blank" rel="noopener">Open cooking video</a></p>`
    : "<p>No video link yet.</p>";

  detailPanel.innerHTML = `
    <div class="detail-hero">
      ${image}
      <div class="detail-copy">
        <div>
          <p class="eyebrow">${escapeHtml(recipe.category)}</p>
          <h2>${escapeHtml(recipe.title)}</h2>
        </div>
        <div class="meta-row">
          <span class="pill">${escapeHtml(recipe.time || "Add time")}</span>
          <span class="pill">${escapeHtml(recipe.difficulty)}</span>
          <span class="pill">${escapeHtml(recipe.kidRating)}</span>
        </div>
        <div class="tag-row">${recipe.tags.map((tag) => `<span class="pill">#${escapeHtml(tag)}</span>`).join("")}</div>
        <div class="action-row">
          <button class="secondary-btn" type="button" id="detailEditBtn">Edit Recipe</button>
          <button class="danger-btn" type="button" id="detailDeleteBtn">Delete Recipe</button>
        </div>
      </div>
    </div>
    <div class="content-grid">
      <section class="content-block">
        <h3>Ingredients</h3>
        <ul>${recipe.ingredients.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>
      <section class="content-block">
        <h3>Steps</h3>
        <ol>${recipe.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
      </section>
      <section class="content-block">
        <h3>Cooking Video</h3>
        ${video}
      </section>
      <section class="content-block">
        <h3>Notes</h3>
        <p>${escapeHtml(recipe.notes || "No notes yet.")}</p>
      </section>
      <section class="content-block suggestions">
        <h3>AI Suggestions</h3>
        <ul>${makeSuggestions(recipe).map((tip) => `<li>${escapeHtml(tip)}</li>`).join("")}</ul>
      </section>
      <section class="content-block">
        <h3>Questions</h3>
        <p>Viewers can use the Ask Question menu. In this offline version, questions save on their device. Add your email in Profile so they can contact you too.</p>
      </section>
    </div>
  `;

  document.querySelector("#detailEditBtn").addEventListener("click", () => openRecipeForm(recipe));
  document.querySelector("#detailDeleteBtn").addEventListener("click", () => deleteRecipe(recipe.id));
}

function openRecipeForm(recipe = null) {
  formTitle.textContent = recipe ? "Edit Recipe" : "Add Recipe";
  recipeForm.reset();
  imagePreview.hidden = true;
  imagePreview.removeAttribute("src");

  document.querySelector("#recipeId").value = recipe?.id || "";
  document.querySelector("#titleInput").value = recipe?.title || "";
  document.querySelector("#categoryInput").value = recipe?.category || "";
  document.querySelector("#timeInput").value = recipe?.time || "";
  document.querySelector("#difficultyInput").value = recipe?.difficulty || "Easy";
  document.querySelector("#kidRatingInput").value = recipe?.kidRating || "Super kid-friendly";
  document.querySelector("#videoInput").value = recipe?.video || "";
  document.querySelector("#tagsInput").value = recipe?.tags?.join(", ") || "";
  document.querySelector("#ingredientsInput").value = recipe?.ingredients?.join("\n") || "";
  document.querySelector("#stepsInput").value = recipe?.steps?.join("\n") || "";
  document.querySelector("#notesInput").value = recipe?.notes || "";
  imageInput.dataset.currentImage = recipe?.image || "";

  if (recipe?.image) {
    imagePreview.src = recipe.image;
    imagePreview.hidden = false;
  }

  recipeDialog.showModal();
}

function closeRecipeForm() {
  recipeDialog.close();
}

async function saveRecipe(event) {
  event.preventDefault();
  const existingId = document.querySelector("#recipeId").value;
  const image = imageInput.files[0] ? await fileToDataUrl(imageInput.files[0]) : imageInput.dataset.currentImage || "";
  const recipe = {
    id: existingId || crypto.randomUUID(),
    title: document.querySelector("#titleInput").value.trim(),
    category: document.querySelector("#categoryInput").value.trim(),
    time: document.querySelector("#timeInput").value.trim(),
    difficulty: document.querySelector("#difficultyInput").value,
    kidRating: document.querySelector("#kidRatingInput").value,
    video: document.querySelector("#videoInput").value.trim(),
    tags: splitLinesOrCommas(document.querySelector("#tagsInput").value),
    image,
    ingredients: splitLines(document.querySelector("#ingredientsInput").value),
    steps: splitLines(document.querySelector("#stepsInput").value),
    notes: document.querySelector("#notesInput").value.trim()
  };

  recipes = existingId ? recipes.map((item) => (item.id === existingId ? recipe : item)) : [recipe, ...recipes];
  selectedId = recipe.id;
  currentPage = 1;
  persistRecipes();
  closeRecipeForm();
  render();
}

function editSelectedRecipe() {
  const recipe = recipes.find((item) => item.id === selectedId);
  if (!recipe) {
    alert("Choose a recipe first, or add a new one.");
    return;
  }
  openRecipeForm(recipe);
}

function deleteSelectedRecipe() {
  const recipe = recipes.find((item) => item.id === selectedId);
  if (!recipe) {
    alert("Choose a recipe first.");
    return;
  }
  deleteRecipe(recipe.id);
}

function deleteRecipe(id) {
  const recipe = recipes.find((item) => item.id === id);
  if (!recipe || !confirm(`Delete "${recipe.title}"?`)) return;
  recipes = recipes.filter((item) => item.id !== id);
  selectedId = "";
  persistRecipes();
  render();
}

function openProfile() {
  document.querySelector("#profileTitleInput").value = profile.title;
  document.querySelector("#ownerEmailInput").value = profile.email;
  profileDialog.showModal();
}

function saveProfile(event) {
  event.preventDefault();
  profile = {
    title: document.querySelector("#profileTitleInput").value.trim(),
    email: document.querySelector("#ownerEmailInput").value.trim()
  };
  persistProfile();
  renderProfile();
  profileDialog.close();
}

function openQuestions() {
  renderQuestions();
  questionDialog.showModal();
}

function saveQuestion(event) {
  event.preventDefault();
  const question = {
    id: crypto.randomUUID(),
    name: document.querySelector("#questionNameInput").value.trim(),
    text: document.querySelector("#questionTextInput").value.trim(),
    createdAt: new Date().toLocaleString()
  };
  questions = [question, ...questions];
  persistQuestions();
  questionForm.reset();
  renderQuestions();

  if (profile.email) {
    const subject = encodeURIComponent(`Question about ${profile.title}`);
    const body = encodeURIComponent(`${question.name} asks:\n\n${question.text}`);
    location.href = `mailto:${profile.email}?subject=${subject}&body=${body}`;
  }
}

function renderQuestions() {
  const emailHelp = profile.email
    ? `<p>Questions are saved here and can also open an email to ${escapeHtml(profile.email)}.</p>`
    : "<p>Add your email in Profile if you want viewers to email questions to you.</p>";
  const items = questions.length
    ? questions.map((question) => `
        <div class="question-item">
          <strong>${escapeHtml(question.name)}</strong>
          <small>${escapeHtml(question.createdAt)}</small>
          <p>${escapeHtml(question.text)}</p>
        </div>
      `).join("")
    : "<p>No questions yet.</p>";
  questionList.innerHTML = `${emailHelp}${items}`;
}

function previewImage() {
  const file = imageInput.files[0];
  if (!file) return;
  fileToDataUrl(file).then((src) => {
    imagePreview.src = src;
    imagePreview.hidden = false;
  });
}

function exportRecipes() {
  const payload = { profile, recipes, questions };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `fancy-recipes-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importRecipes() {
  const file = importInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      recipes = Array.isArray(imported) ? imported.map(normalizeRecipe) : (imported.recipes || []).map(normalizeRecipe);
      questions = Array.isArray(imported.questions) ? imported.questions : questions;
      profile = imported.profile ? { ...profile, ...imported.profile } : profile;
      selectedId = "";
      currentPage = 1;
      persistRecipes();
      persistQuestions();
      persistProfile();
      renderProfile();
      render();
    } catch {
      alert("That file could not be imported. Please choose a recipe export JSON file.");
    } finally {
      importInput.value = "";
    }
  };
  reader.readAsText(file);
}

function installApp() {
  installDialog.showModal();
}

async function copyShareLink() {
  shareLinkInput.select();
  shareLinkInput.setSelectionRange(0, 99999);

  try {
    await navigator.clipboard.writeText(shareLinkInput.value);
    document.querySelector("#copyLinkBtn").textContent = "Copied";
    setTimeout(() => {
      document.querySelector("#copyLinkBtn").textContent = "Copy Link";
    }, 1200);
  } catch {
    document.execCommand("copy");
  }
}

function setActiveNav(view) {
  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
}

function normalizeRecipe(recipe) {
  return {
    id: recipe.id || crypto.randomUUID(),
    title: recipe.title || "Untitled recipe",
    category: recipe.category || "Unsorted",
    time: recipe.time || "",
    difficulty: recipe.difficulty || "Easy",
    kidRating: recipe.kidRating || "Good for teens",
    video: recipe.video || "",
    tags: Array.isArray(recipe.tags) ? recipe.tags : [],
    image: recipe.image || "",
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    steps: Array.isArray(recipe.steps) ? recipe.steps : [],
    notes: recipe.notes || ""
  };
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function splitLines(value) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitLinesOrCommas(value) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim().replace(/^#/, ""))
    .filter(Boolean);
}

function makeSuggestions(recipe) {
  const text = [...recipe.ingredients, ...recipe.steps, recipe.notes].join(" ").toLowerCase();
  const tips = [];

  if (!text.includes("vegetable") && !text.includes("fruit") && !text.includes("carrot") && !text.includes("spinach")) {
    tips.push("Add a colorful fruit or vegetable side to make the plate more fun.");
  }
  if (recipe.kidRating === "Needs adult help") {
    tips.push("Mark hot pans, sharp tools, or heavy lifting steps for adult help.");
  } else {
    tips.push("This recipe looks friendly enough for a teen cook to try with simple prep.");
  }
  if (!text.includes("egg") && !text.includes("beans") && !text.includes("chicken") && !text.includes("paneer") && !text.includes("tofu")) {
    tips.push("For a more filling version, add protein like beans, egg, tofu, paneer, yogurt, or chicken.");
  }
  if (recipe.video) {
    tips.push("Watch the linked video once before cooking so the steps feel easier.");
  }
  tips.push("Take a bright photo near a window before eating to make the recipe card pop.");

  return tips.slice(0, 4);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
