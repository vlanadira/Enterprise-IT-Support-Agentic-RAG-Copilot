// Connect this UI to your backend endpoint.
const API_URL = "/api/chat";

const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("questionInput");
const sendBtn = document.getElementById("sendBtn");
const traceList = document.getElementById("traceList");
const sourceInfo = document.getElementById("sourceInfo");
const welcome = document.getElementById("welcome");

// Display current date
document.getElementById("dateLabel").textContent =
  new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(new Date());


// Prevent HTML injection
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}


// Scroll to latest message
function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}


// Display chat message
function addMessage(text, role, meta = {}) {

  welcome?.remove();

  const wrap = document.createElement("div");

  wrap.className = `message ${role}`;

  const avatar = role === "user" ? "JD" : "✳";

  const source = meta.source
    ? `<div class="answer-source ${meta.sourceClass || ""}">
        ${escapeHTML(meta.source)}
       </div>`
    : "";

  wrap.innerHTML = `
    <div class="message-avatar">${avatar}</div>

    <div>
      <div class="bubble">${escapeHTML(text)}</div>

      ${source}

      <div class="message-meta">
        ${role === "user" ? "You" : "Northstar Support Copilot"}
        ·
        ${new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        })}
      </div>
    </div>
  `;

  messagesEl.appendChild(wrap);

  scrollToBottom();

  return wrap;
}


// Typing animation
function showTyping() {

  const el = document.createElement("div");

  el.className = "message";
  el.id = "typingIndicator";

  el.innerHTML = `
    <div class="message-avatar">✳</div>

    <div class="bubble">
      <div class="typing">
        <i></i>
        <i></i>
        <i></i>
      </div>
    </div>
  `;

  messagesEl.appendChild(el);

  scrollToBottom();
}


// Display LangGraph execution trace
function renderTrace(trace = []) {

  traceList.innerHTML = "";

  if (!trace.length) {

    traceList.innerHTML = `
      <li class="empty-trace">
        No agent activity was returned.
      </li>
    `;

    return;
  }

  trace.forEach((step, i) => {

    const li = document.createElement("li");

    li.className = "done";

    li.textContent = step;

    traceList.appendChild(li);

  });
}


// Display response citations
function renderSources(citations = [], sourceUsed = "") {

  sourceInfo.innerHTML = "";

  if (!citations.length && !sourceUsed) {

    sourceInfo.textContent = "No source metadata returned.";

    return;
  }

  if (!citations.length) {

    const p = document.createElement("p");

    p.className = "empty-trace";

    p.textContent = sourceUsed.replaceAll("_", " ");

    sourceInfo.appendChild(p);

    return;
  }

  citations.forEach(c => {

    const row = document.createElement("div");

    row.className = "source-row";

    const title = c.title || c.url || "Source";

    row.innerHTML = `
      <div class="source-icon">
        ${c.type === "private_kb" ? "▤" : "↗"}
      </div>

      <div>
        <strong>${escapeHTML(title)}</strong>

        <p>
          ${escapeHTML(
            c.type === "private_kb"
              ? "Company private knowledge base"
              : (c.url || "External source")
          )}
        </p>
      </div>
    `;

    sourceInfo.appendChild(row);

  });
}


// Map backend source to UI label
function sourceLabel(source) {

  const map = {

    private_kb: "✓ Company knowledge base",

    web_search: "↗ External web search",

    direct: "✳ General response",

    insufficient_evidence: "! Insufficient evidence"

  };

  return map[source] || source || "Response generated";
}


// Main chatbot function
async function sendQuestion(question) {

  const clean = question.trim();

  if (!clean) return;

  // Display user's message
  addMessage(clean, "user");

  inputEl.value = "";

  inputEl.style.height = "auto";

  sendBtn.disabled = true;

  // Show loading animation
  showTyping();

  // Initial agent activity
  renderTrace(["Routing question"]);

  sourceInfo.textContent = "Retrieving relevant sources...";

  try {

    // Send question to FastAPI backend
    const response = await fetch(API_URL, {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        question: clean
      })

    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    // Get backend response
    const data = await response.json();

    document.getElementById("typingIndicator")?.remove();

    const answer =
      data.answer || "The assistant returned an empty response.";

    const source = data.source_used || "";

    const label = sourceLabel(source);

    const sourceClass =
      source === "web_search"
        ? "web"
        : (
            source === "direct" ||
            source === "insufficient_evidence"
          )
          ? "direct"
          : "";

    // Display AI response
    addMessage(answer, "assistant", {
      source: label,
      sourceClass: sourceClass
    });

    // Update agent trace
    renderTrace(data.trace || []);

    // Update citations
    renderSources(
      data.citations || [],
      source
    );

  } catch (error) {

    document.getElementById("typingIndicator")?.remove();

    addMessage(
      `I couldn't connect to the support service.
Please try again, or contact the IT Service Desk if the issue is urgent.

Technical detail: ${error.message}`,
      "assistant",
      {
        source: "Connection error",
        sourceClass: "direct"
      }
    );

    renderTrace([
      "Request sent to API",
      "Connection failed"
    ]);

    sourceInfo.textContent =
      "The API did not return source information.";

    console.error("Chat API error:", error);

  } finally {

    sendBtn.disabled = false;

    inputEl.focus();

  }
}


// Submit question
document.getElementById("chatForm")
  .addEventListener("submit", e => {

    e.preventDefault();

    sendQuestion(inputEl.value);

  });


// Enter to send, Shift + Enter for new line
inputEl.addEventListener("keydown", e => {

  if (e.key === "Enter" && !e.shiftKey) {

    e.preventDefault();

    document.getElementById("chatForm").requestSubmit();

  }

});


// Automatically resize textarea
inputEl.addEventListener("input", () => {

  inputEl.style.height = "auto";

  inputEl.style.height =
    Math.min(inputEl.scrollHeight, 110) + "px";

});


// Suggested questions
document.querySelectorAll(".suggestion")
  .forEach(btn => {

    btn.addEventListener("click", () => {

      sendQuestion(btn.dataset.prompt);

    });

  });


// Reset conversation
function resetChat() {

  messagesEl.innerHTML = `

    <div class="welcome" id="welcome">

      <div class="welcome-symbol">✳</div>

      <h2>Welcome to IT Support</h2>

      <p>
        Ask a question in your own words.
        I’ll look for guidance in the company knowledge base first,
        then use external sources if needed.
      </p>

      <div class="suggestions">

        <button class="suggestion"
          data-prompt="How do I reset my company password?">

          <span>⌑</span>
          How do I reset my company password?

        </button>

        <button class="suggestion"
          data-prompt="I can't connect to the company VPN. How can I troubleshoot it?">

          <span>⌁</span>
          I'm having trouble connecting to VPN

        </button>

        <button class="suggestion"
          data-prompt="How do I set up multi-factor authentication (MFA)?">

          <span>◉</span>
          Set up multi-factor authentication

        </button>

        <button class="suggestion"
          data-prompt="I need access to a company software application. What should I do?">

          <span>▦</span>
          Request access to software

        </button>

      </div>

    </div>

  `;

  // Reattach suggestion listeners
  document.querySelectorAll(".suggestion")
    .forEach(btn => {

      btn.addEventListener("click", () => {

        sendQuestion(btn.dataset.prompt);

      });

    });

  traceList.innerHTML = `
    <li class="empty-trace">
      Your assistant activity will appear here when you send a question.
    </li>
  `;

  sourceInfo.textContent =
    "Sources used for an answer will be displayed here.";

}


// New conversation
document.getElementById("newChatBtn")
  .addEventListener("click", resetChat);


// Clear conversation
document.getElementById("clearBtn")
  .addEventListener("click", resetChat);

// ==========================================
// DOCUMENT UPLOAD
// ==========================================

const addDocumentBtn = document.getElementById("addDocumentBtn");
const uploadModal = document.getElementById("uploadModal");
const closeUploadModal = document.getElementById("closeUploadModal");
const cancelUploadBtn = document.getElementById("cancelUploadBtn");

const uploadForm = document.getElementById("uploadForm");
const adminApiKeyInput = document.getElementById("adminApiKey");
const documentFileInput = document.getElementById("documentFile");
const uploadBtn = document.getElementById("uploadBtn");
const uploadStatus = document.getElementById("uploadStatus");

// Open modal
addDocumentBtn.addEventListener("click", () => {
    uploadModal.hidden = false;
    uploadModal.classList.add("active");
    uploadStatus.textContent = "";
    uploadStatus.className = "upload-status";
    adminApiKeyInput.focus();
});

// Close modal
function closeModal() {
    uploadModal.classList.remove("active");
    uploadModal.hidden = true;
    addDocumentBtn.focus();
}

closeUploadModal.addEventListener("click", closeModal);
cancelUploadBtn.addEventListener("click", closeModal);

// Close when clicking outside the modal
uploadModal.addEventListener("click", (e) => {
    if (e.target === uploadModal) {
        closeModal();
    }
});

// Close with Escape
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && uploadModal.classList.contains("active")) {
        closeModal();
    }
});

// Display upload status
function showUploadStatus(message, type) {
    uploadStatus.textContent = message;
    uploadStatus.className = `upload-status ${type}`;
}

// Handle document upload
uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const adminKey = adminApiKeyInput.value.trim();
    const file = documentFileInput.files[0];

    if (!adminKey || !file) {
        showUploadStatus(
            "Please enter your admin API key and select a document.",
            "error"
        );
        return;
    }

    // Validate file extension
    const allowedExtensions = [".pdf", ".txt", ".md", ".docx"];

    const extension = file.name
        .substring(file.name.lastIndexOf("."))
        .toLowerCase();

    if (!allowedExtensions.includes(extension)) {
        showUploadStatus(
            "Unsupported file format. Please select PDF, TXT, MD, or DOCX.",
            "error"
        );
        return;
    }

    uploadBtn.disabled = true;
    uploadBtn.textContent = "Checking API key...";

    showUploadStatus(
        "Checking the admin API key...",
        "loading"
    );

    try {
        const verification = await fetch("/api/admin/verify", {
            method: "POST",
            headers: {
                "X-Admin-Key": adminKey
            }
        });
        const verificationData = await verification.json();

        if (!verification.ok) {
            throw new Error(verificationData.detail || "Invalid admin API key.");
        }

        showUploadStatus(
            "Admin API key verified. Uploading and indexing document...",
            "loading"
        );
        uploadBtn.textContent = "Uploading...";

        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/ingest", {
            method: "POST",
            headers: {
                "X-Admin-Key": adminKey
            },
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Document upload failed.");
        }

        showUploadStatus(
            `✓ ${data.message} ${data.file} — ${data.chunks} chunks indexed.`,
            "success"
        );

        // Clear form after successful upload
        uploadForm.reset();

    } catch (error) {
        showUploadStatus(
            `Upload failed: ${error.message}`,
            "error"
        );

        console.error("Document upload error:", error);

    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = "Upload & Ingest";
    }
});