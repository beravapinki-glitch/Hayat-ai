const fs = require("fs");
const path = require("path");
const os = require("os");

const ROOT = path.resolve(__dirname, "..");
const GENERATED = path.join(ROOT, "generated");
const PROJECTS = path.join(ROOT, "projects");

fs.mkdirSync(GENERATED, { recursive: true });
fs.mkdirSync(PROJECTS, { recursive: true });

function safeName(value) {
  const name = String(value || "file.txt").trim();
  if (!name || name === "." || name === ".." || /[\\/\0]/.test(name) || name.length > 100) {
    throw new Error("Invalid file or project name");
  }
  return name;
}

const MAX_FILE_BYTES = 1024 * 1024;
const MAX_PROJECT_BYTES = 5 * 1024 * 1024;

function validateContent(content) {
  const text = String(content ?? "");
  if (Buffer.byteLength(text, "utf8") > MAX_FILE_BYTES) {
    throw new Error("File content exceeds the 1 MB limit");
  }
  return text;
}

function assertSafeRoot(root) {
  if (fs.lstatSync(root).isSymbolicLink()) {
    throw new Error("Workspace directories cannot be symbolic links");
  }
}

function assertNoSymlinkParents(root, target) {
  let current = root;
  const relative = path.relative(root, path.dirname(target));
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    try {
      if (fs.lstatSync(current).isSymbolicLink()) throw new Error("Symbolic links are not allowed in project paths");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}

function tools() {
  return [

    {
      type: "function",

      name: "device_info",

      description:
        "Return basic information about the server runtime environment.",

      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false
      }
    },

    {
      type: "function",

      name: "current_time",

      description:
        "Return current local/server time.",

      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false
      }
    },

    {
      type: "function",

      name: "create_file",

      description:
        "Create a text/code file inside the generated directory.",

      parameters: {
        type: "object",

        properties: {
          filename: {
            type: "string"
          },

          content: {
            type: "string"
          }
        },

        required: [
          "filename",
          "content"
        ],

        additionalProperties: false
      }
    },

    {
      type: "function",

      name: "create_project",

      description:
        "Create a project folder and multiple text/code files. Use for websites or code projects.",

      parameters: {
        type: "object",

        properties: {
          project_name: {
            type: "string"
          },

          files: {
            type: "array",

            items: {
              type: "object",

              properties: {
                path: {
                  type: "string"
                },

                content: {
                  type: "string"
                }
              },

              required: [
                "path",
                "content"
              ],

              additionalProperties: false
            }
          }
        },

        required: [
          "project_name",
          "files"
        ],

        additionalProperties: false
      }
    },

    {
      type: "function",

      name: "list_projects",

      description:
        "List projects previously created by the agent.",

      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false
      }
    },

    {
      type: "function",

      name: "list_files",

      description:
        "List generated files.",

      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false
      }
    },

    {
      type: "function",

      name: "prepare_whatsapp",

      description:
        "Prepare a WhatsApp message for explicit user review. Never silently sends it.",

      parameters: {
        type: "object",

        properties: {
          phone: {
            type: "string"
          },

          message: {
            type: "string"
          }
        },

        required: [
          "phone",
          "message"
        ],

        additionalProperties: false
      }
    },

    {
      type: "function",

      name: "open_url",

      description:
        "Prepare a URL for opening in the Android application.",

      parameters: {
        type: "object",

        properties: {
          url: {
            type: "string"
          }
        },

        required: [
          "url"
        ],

        additionalProperties: false
      }
    }

  ];
}

async function execute(name, args = {}) {

  if (name === "device_info") {

    return {
      platform: process.platform,
      architecture: process.arch,
      node: process.version,
      home: os.homedir(),
      hostname: os.hostname()
    };

  }

  if (name === "current_time") {

    return {
      iso: new Date().toISOString(),
      local: new Date().toString()
    };

  }

  if (name === "create_file") {

    assertSafeRoot(GENERATED);

    const filename =
      safeName(args.filename);

    const target =
      path.join(
        GENERATED,
        filename
      );

    const content = validateContent(args.content);
    if (fs.existsSync(target)) throw new Error("File already exists; existing files are not overwritten");

    fs.writeFileSync(
      target,
      content,
      { encoding: "utf8", flag: "wx" }
    );

    return {
      ok: true,
      path: target
    };

  }

  if (name === "create_project") {

    assertSafeRoot(PROJECTS);

    const projectName =
      safeName(args.project_name);

    const projectRoot =
      path.join(
        PROJECTS,
        projectName
      );

    if (fs.existsSync(projectRoot) && fs.lstatSync(projectRoot).isSymbolicLink()) {
      throw new Error("Project directory cannot be a symbolic link");
    }

    if (!Array.isArray(args.files) || args.files.length < 1 || args.files.length > 25) {
      throw new Error("A project must contain between 1 and 25 files");
    }

    fs.mkdirSync(
      projectRoot,
      {
        recursive: true
      }
    );

    const created = [];
    let totalBytes = 0;

    for (
      const file of
      (args.files || [])
    ) {

      const relative = String(file.path || "");
      if (!relative || relative.includes("\\") || path.isAbsolute(relative) || relative.split("/").some(part => !part || part === "." || part === "..")) {
        throw new Error("Unsafe project path");
      }

      const target =
        path.resolve(
          projectRoot,
          relative
        );

      if (
        !target.startsWith(projectRoot + path.sep)
      ) {
        throw new Error(
          "Unsafe project path"
        );
      }

      assertNoSymlinkParents(projectRoot, target);
      const content = validateContent(file.content);
      totalBytes += Buffer.byteLength(content, "utf8");
      if (totalBytes > MAX_PROJECT_BYTES) throw new Error("Project content exceeds the 5 MB limit");
      if (fs.existsSync(target)) throw new Error(`File already exists and was not overwritten: ${relative}`);

      fs.mkdirSync(
        path.dirname(target),
        {
          recursive: true
        }
      );

      fs.writeFileSync(
        target,
        content,
        { encoding: "utf8", flag: "wx" }
      );

      created.push(
        path.relative(
          projectRoot,
          target
        )
      );
    }

    return {
      ok: true,
      project: projectName,
      path: projectRoot,
      files: created
    };

  }

  if (name === "list_projects") {

    assertSafeRoot(PROJECTS);

    return {
      projects:
        fs.readdirSync(
          PROJECTS,
          {
            withFileTypes: true
          }
        )
        .filter(
          x => x.isDirectory()
        )
        .map(
          x => x.name
        )
    };

  }

  if (name === "list_files") {

    assertSafeRoot(GENERATED);

    return {
      files:
        fs.readdirSync(
          GENERATED
        )
    };

  }

  if (name === "prepare_whatsapp") {

    return {
      ok: true,

      action:
        "review_required",

      phone:
        String(args.phone || ""),

      message:
        String(args.message || ""),

      note:
        "Message prepared. The Android app must ask the user for confirmation before sharing/sending."
    };

  }

  if (name === "open_url") {

    const url =
      String(args.url || "");

    if (
      !/^https?:\/\//i.test(url)
    ) {
      throw new Error(
        "Only http/https URLs are allowed."
      );
    }

    return {
      ok: true,
      action: "open_url",
      url
    };

  }

  throw new Error(
    `Unknown tool: ${name}`
  );
}

module.exports = {
  tools,
  execute
};
