let provider, signer, contract, account, cachedItems = [];
const STATUS = ["Looking for it", "Found - awaiting return", "Returned safely", "Closed"];
const $ = (id) => document.getElementById(id);

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function setStatus(msg, ok) {
  const el = $("status");
  el.textContent = msg;
  el.className = ok === undefined ? "" : ok ? "ok" : "err";
}

function errMsg(e) {
  if (e.code === 4001 || e.code === "ACTION_REJECTED") return "Transaction rejected in MetaMask";
  const raw = e?.error?.data?.message || e?.error?.message || e?.data?.message || e?.reason || e?.message || "Unknown error";
  const m = raw.match(/reverted(?: with reason string)?:? ?'?([^'\n]+)'?/);
  return m ? m[1] : raw;
}

// ---------- Connect ----------
$("connectBtn").onclick = async () => {
  if (!window.ethereum) return alert("Please install MetaMask");
  try {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    account = await signer.getAddress();
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    const net = await provider.getNetwork();
    $("account").textContent = account;
    $("network").textContent = net.name + " (chainId " + net.chainId + ")";
    $("admin").textContent = await contract.admin();
    setStatus("Wallet connected", true);
    await loadItems();
  } catch (e) {
    setStatus("❌ Connection failed: " + errMsg(e), false);
  }
};

if (window.ethereum) {
  window.ethereum.on("accountsChanged", () => location.reload());
  window.ethereum.on("chainChanged", () => location.reload());
}

// ---------- Send transaction helper ----------
async function send(fn, label) {
  if (!contract) return setStatus("Connect MetaMask first", false);
  try {
    setStatus("Waiting for MetaMask confirmation...");
    const tx = await fn();
    setStatus("Transaction sent, waiting to be mined: " + tx.hash);
    await tx.wait();
    setStatus("✅ " + label + " | Tx hash: " + tx.hash, true);
    await loadItems();
  } catch (e) {
    setStatus("❌ Failed: " + errMsg(e), false);
  }
}

// ---------- Post item ----------
$("postBtn").onclick = () => {
  const title = $("title").value.trim();
  const description = $("description").value.trim();
  const location = $("location").value.trim();
  const reward = $("reward").value.trim() || "0";
  if (!title || !location) return setStatus("Add a title and last known location first.", false);
  if (description.length < 10) return setStatus("Add a few more helpful details (at least 10 characters).", false);
  try {
    ethers.utils.parseEther(reward);
  } catch (e) {
    return setStatus("Enter a valid ETH reward amount.", false);
  }
  return send(() => contract.postItem(title, description, location, {
    value: ethers.utils.parseEther(reward)
  }), "Report published");
};

// ---------- Load and display items ----------
async function loadItems() {
  if (!contract) return;
  const count = (await contract.itemCount()).toNumber();
  $("total").textContent = count;
  cachedItems = [];
  for (let id = count; id >= 1; id--) {
    const it = await contract.getItem(id);
    cachedItems.push(it);
  }
  renderItems();
}

function renderItems() {
  const query = $("searchInput").value.trim().toLowerCase();
  const filter = $("statusFilter").value;
  const box = $("items");
  const visible = cachedItems.filter((it) => {
    const matchesText = !query || it.title.toLowerCase().includes(query) || it.location.toLowerCase().includes(query);
    return matchesText && (filter === "all" || Number(it.status) === Number(filter));
  });
  box.innerHTML = visible.length ? "" : '<p class="empty">No trails match your filters yet.</p>';
  for (const it of visible) {
    const st = Number(it.status);
    const active = st === 0 || st === 1;
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <h3>#${it.id} - ${esc(it.title)} <span class="badge s${st}">${STATUS[st]}</span></h3>
      <p>${esc(it.description)}</p>
      <p><b>Last known location:</b> ${esc(it.location)}</p>
      <p><b>Reward in escrow:</b> ${ethers.utils.formatEther(it.reward)} ETH</p>
      <p><b>Posted:</b> ${new Date(it.postedAt.toNumber() * 1000).toLocaleString()}</p>
      <p><b>Owner:</b> <span class="addr">${it.owner}</span></p>
      ${st === 1 ? `<p><b>Finder:</b> <span class="addr">${it.finder}</span><br><b>Note:</b> ${esc(it.foundNote)}</p>` : ""}
      ${st === 2 ? `<p><b>Returned via finder:</b> <span class="addr">${it.finder}</span></p>` : ""}
      <div>
        ${st === 0 ? `<button data-a="found" data-id="${it.id}">I found this</button>` : ""}
        ${st === 1 ? `<button data-a="confirm" data-id="${it.id}">Confirm safe return</button>
                      <button class="secondary" data-a="reject" data-id="${it.id}">Dismiss report</button>` : ""}
        ${active ? `<button class="danger" data-a="cancel" data-id="${it.id}">Close report</button>
                    <button class="danger" data-a="admin" data-id="${it.id}">Remove (admin)</button>` : ""}
      </div>`;
    box.appendChild(div);
  }
}

$("refreshBtn").onclick = loadItems;
$("searchInput").oninput = renderItems;
$("statusFilter").onchange = renderItems;

// ---------- Item actions ----------
$("items").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const id = b.dataset.id;
  switch (b.dataset.a) {
    case "found": {
      const note = prompt("Where/how can the owner collect it?");
      send(() => contract.reportFound(id, note || ""), "Found report submitted");
      break;
    }
    case "confirm": send(() => contract.confirmReturn(id), "Return confirmed, reward paid"); break;
    case "reject":  send(() => contract.rejectFinder(id), "Finder rejected, item reopened"); break;
    case "cancel":
      if (confirm("Close this report and refund any escrowed reward?")) {
        send(() => contract.cancelItem(id), "Report closed, reward refunded");
      }
      break;
    case "admin":   send(() => contract.adminRemoveItem(id), "Item removed by admin"); break;
  }
});