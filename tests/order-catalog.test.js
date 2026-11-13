import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const html = await readFile(new URL("../menu.html", import.meta.url), "utf8");
const orderScript = await readFile(new URL("../order.js", import.meta.url), "utf8");
const catalog = JSON.parse(await readFile(new URL("../supabase/functions/tcc-orders/menu-catalog.json", import.meta.url), "utf8"));
const decode = value => value.replace(/&amp;/g,"&").replace(/&#x27;|&#39;/gi,"'").replace(/&quot;/g,'"').replace(/&nbsp;/g," ");

function visibleMenuRows(source) {
  const rows = [];
  for (const match of source.matchAll(/<article class="m-item">([\s\S]*?)<\/article>/g)) {
    const row = match[1];
    const heading = (row.match(/<h3[^>]*>([\s\S]*?)<\/h3>/) ?? [, ""])[1]
      .replace(/<span class="tcc-bestseller-badge"[\s\S]*?<\/span><\/span><\/span>/g, "")
      .replace(/<span class="tcc-new-arrival-badge"[\s\S]*?<\/span><\/span>/g, "")
      .replace(/<[^>]+>/g, " ");
    const name = decode(heading).replace(/♛\s*Best Seller|✦\s*NEW ARRIVAL|✦\s*NEW LAUNCH/gi,"").replace(/\s+/g," ").trim();
    const price = (row.match(/<strong[^>]*>₹\s*([\d,]+)/) ?? [, ""])[1];
    if (!name || !price) continue;
    const group = [...source.slice(0,match.index).matchAll(/<div class="menu-group" id="([^"]+)"/g)].at(-1)?.[1];
    rows.push({
      id:name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""),
      name, group, price_paise:Number(price.replace(/,/g,""))*100,
      available:!row.includes("availability-status")
    });
  }
  return rows;
}

test("trusted order catalog matches every visible menu row", () => {
  const rows = visibleMenuRows(html);
  assert.equal(catalog.length,rows.length);
  for (const row of rows) {
    const trusted = catalog.find(item=>item.id===row.id);
    assert.ok(trusted,`missing catalog item: ${row.name}`);
    assert.equal(trusted.name,row.name);
    assert.equal(trusted.group,row.group);
    assert.equal(trusted.price_paise,row.price_paise,`price mismatch: ${row.name}`);
    assert.equal(trusted.available,row.available,`availability mismatch: ${row.name}`);
  }
});

test("catalog IDs are unique and prices are positive integer paise", () => {
  const ids=catalog.map(item=>item.id);
  assert.equal(new Set(ids).size,ids.length);
  for(const item of catalog){
    assert.match(item.id,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(Number.isInteger(item.price_paise)&&item.price_paise>0);
  }
});

test("sold-out menu products are disabled in the trusted catalog", () => {
  const soldOut=visibleMenuRows(html).filter(item=>!item.available);
  assert.equal(soldOut.length,15);
  for(const item of soldOut)assert.equal(catalog.find(entry=>entry.id===item.id)?.available,false,item.name);
});


test("menu Add and quantity controls use delegated, targeted updates", () => {
  assert.match(orderScript, /add\.addEventListener\("click",event=>/);
  assert.match(orderScript, /minus\.addEventListener\("click",event=>/);
  assert.match(orderScript, /plus\.addEventListener\("click",event=>/);
  assert.match(orderScript, /dataset\.qtyChange/);
  const addItem = orderScript.slice(orderScript.indexOf("function addItem(item)"), orderScript.indexOf("function updateQty"));
  const updateQty = orderScript.slice(orderScript.indexOf("function updateQty"), orderScript.indexOf("function totals"));
  assert.doesNotMatch(addItem, /querySelectorAll\("\.menu-group \.m-item"\)/);
  assert.doesNotMatch(updateQty, /querySelectorAll\("\.menu-group \.m-item"\)/);
  assert.match(addItem, /renderProductControl\(findOrderRow\(item\.id\)\)/);
  assert.match(updateQty, /renderProductControl\(findOrderRow\(id\)\)/);
});
