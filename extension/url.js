export function parseGitHubUrl(url) {
  console.log("[url] parseGitHubUrl", url);
  // Examples:
  //  - https://github.com/OWNER/REPO
  //  - https://github.com/OWNER/REPO/tree/BRANCH/path/to/dir
  //  - https://github.com/OWNER/REPO/blob/BRANCH/path/to/file#L123
  const u = new URL(url);
  const parts = u.pathname.split("/").filter(Boolean); // [owner, repo, (blob|tree)?, branch?, ...path]
  const [owner, repo, type, branch, ...rest] = parts;

  const result = { owner, repo, type, branch: undefined, commit: undefined, filepath: undefined, line: undefined };

  if (!owner || !repo) return result;

  if (type === "blob" || type === "tree") {
    if (branch) {
      const isFullSha = /^[0-9a-f]{40}$/i.test(branch);
      if (isFullSha) {
        result.commit = branch;
      } else {
        result.branch = branch;
      }
    }
    result.filepath = rest.length ? rest.join("/") : undefined;
    result.type = type; // blob= file view, tree= directory view
  } else {
    result.type = "repo";
  }

  const hash = u.hash.replace(/^#/, "");
  // L10 or L10C5 or L10-L20 – we’ll take the first line number
  const m = hash.match(/L(\d+)/);
  if (m) result.line = parseInt(m[1], 10);

  console.log("[url] parseGitHubUrl result", result);
  return result;
}
