
const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

let menu = [];
let cart = [];
let selectedCategory = "Бургеры";
let modalItem = null;
let modalOptionIndex = 0;

const rub = n => `${n.toLocaleString("ru-RU")} ₽`;

async function boot(){
  menu = await fetch("menu.json").then(r=>r.json());
  renderCategories();
  renderMenu();
  bind();
}
function categories(){
  return [...new Set(menu.map(x=>x.category))];
}
function renderCategories(){
  const box=document.getElementById("categories");
  box.innerHTML="";
  categories().forEach(c=>{
    const b=document.createElement("button");
    b.textContent=c;
    b.className=c===selectedCategory?"active":"";
    b.onclick=()=>{selectedCategory=c;renderCategories();renderMenu();window.scrollTo({top:0,behavior:"smooth"})};
    box.appendChild(b);
  });
}
function renderMenu(){
  const box=document.getElementById("menu");
  box.innerHTML="";
  menu.filter(x=>x.category===selectedCategory).forEach((item,idx)=>{
    const card=document.createElement("article");
    card.className="card";
    const from = item.options
  ? `от ${rub(Math.min(...item.options.map(o=>o.price)))}`
  : rub(item.price);
    card.innerHTML=`<h3>${item.name}</h3><p>${item.description||""}</p><div class="card-footer"><span class="price">${from}</span><button class="add">+</button></div>`;
    card.querySelector(".add").onclick=()=>openItem(item);
    box.appendChild(card);
  });
}
function openItem(item){
  modalItem=item; modalOptionIndex=0;
  document.getElementById("modalTitle").textContent=item.name;
  document.getElementById("modalDesc").textContent=item.description||"";
  const opts=document.getElementById("modalOptions");
  opts.innerHTML="";
  if(item.options){
    item.options.forEach((o,i)=>{
      const label=document.createElement("label");
      label.className="option";
      label.innerHTML=`<input type="radio" name="itemOption" ${i===0?"checked":""}> ${o.label} — ${rub(o.price)}`;
      label.querySelector("input").onchange=()=>modalOptionIndex=i;
      opts.appendChild(label);
    });
  }
  document.getElementById("modal").classList.remove("hidden");
}
function addModalItem(){
  const option=modalItem.options?.[modalOptionIndex];
  const key=modalItem.name+"__"+(option?.label||"");
  const found=cart.find(x=>x.key===key);
  if(found) found.qty++;
  else cart.push({key,name:modalItem.name,option:option?.label||"",price:option?.price??modalItem.price,qty:1});
  document.getElementById("modal").classList.add("hidden");
  updateCart();
}
function updateCart(){
  document.getElementById("cartCount").textContent=cart.reduce((s,x)=>s+x.qty,0);
  const list=document.getElementById("cartItems");
  list.innerHTML="";
  cart.forEach((x,i)=>{
    const row=document.createElement("div");
    row.className="cart-row";
    row.innerHTML=`<div><strong>${x.name}</strong><div class="small">${x.option}</div><div>${rub(x.price*x.qty)}</div></div><div class="qty"><button data-act="minus">−</button><span>${x.qty}</span><button data-act="plus">+</button></div>`;
    row.querySelector('[data-act="minus"]').onclick=()=>{x.qty--;if(x.qty<=0)cart.splice(i,1);updateCart()};
    row.querySelector('[data-act="plus"]').onclick=()=>{x.qty++;updateCart()};
    list.appendChild(row);
  });
  const sub=cart.reduce((s,x)=>s+x.price*x.qty,0);
  const delivery=document.querySelector('input[name="fulfillment"]:checked')?.value==="delivery"?200:0;
  document.getElementById("subtotal").textContent=rub(sub);
  document.getElementById("deliveryFee").textContent=rub(delivery);
  document.getElementById("total").textContent=rub(sub+delivery);
}
function bind(){
  document.getElementById("openCart").onclick=()=>{updateCart();document.getElementById("cartDrawer").classList.remove("hidden")};
  document.getElementById("closeCart").onclick=()=>document.getElementById("cartDrawer").classList.add("hidden");
  document.getElementById("modalClose").onclick=()=>document.getElementById("modal").classList.add("hidden");
  document.getElementById("modalAdd").onclick=addModalItem;
  document.querySelectorAll('input[name="fulfillment"]').forEach(r=>r.onchange=()=>{
    const isDel=document.querySelector('input[name="fulfillment"]:checked').value==="delivery";
    document.getElementById("deliveryFields").classList.toggle("hidden",!isDel);
    updateCart();
  });
  document.getElementById("checkoutBtn").onclick=checkout;
}
async function checkout(){
  if(!cart.length) return alert("Корзина пустая.");

  const fulfillment=document.querySelector('input[name="fulfillment"]:checked').value;
  const payment=document.querySelector('input[name="payment"]:checked').value;
  const name=document.getElementById("name").value.trim();
  const phone=document.getElementById("phone").value.trim();
  const address=document.getElementById("address").value.trim();
  const comment=document.getElementById("comment").value.trim();

  if(!name || !phone) return alert("Укажите имя и телефон.");
  if(fulfillment==="delivery" && !address) return alert("Укажите адрес доставки.");

  const subtotal=cart.reduce((s,x)=>s+x.price*x.qty,0);
  const fee=fulfillment==="delivery"?200:0;

  const order={
    createdAt:new Date().toISOString(),
    customer:{name,phone,address,comment},
    fulfillment,
    payment,
    items:cart,
    subtotal,
    deliveryFee:fee,
    total:subtotal+fee
  };

  localStorage.setItem("av_last_order",JSON.stringify(order));

  let text =
`👤 Клиент: ${name}
📞 Телефон: ${phone}

🛍 ЗАКАЗ:
${cart.map(x =>
`${x.qty}× ${x.name}${x.option ? ` (${x.option})` : ""} — ${rub(x.price * x.qty)}`
).join("\n")}

💵 Товары: ${rub(subtotal)}
${fulfillment === "delivery" ? `🚗 Доставка: ${rub(fee)}` : "🚶 Самовывоз"}
💰 ИТОГО: ${rub(order.total)}

${fulfillment === "delivery"
? `📍 Адрес: ${address}`
: "📍 Самовывоз: Вокзальная площадь, 1А (вход со стороны вокзала)"}

💳 Оплата: ${payment === "cash" ? "Наличными при получении" : "QR-кодом при получении"}

💬 Комментарий: ${comment || "Нет"}`;
  try {
    const response = await fetch("/api/order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
  text: text,
  telegramUserId: tg?.initDataUnsafe?.user?.id || null
})
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Ошибка отправки:", result);
      alert("Заказ сформирован, но не удалось отправить сотрудникам.");
      return;
    }
cart = [];
updateCart();
document.getElementById("cartDrawer").classList.add("hidden");
    alert(text + "\n\n✅ Заказ отправлен сотрудникам.");
  } catch (error) {
    console.error(error);
    alert("Заказ сформирован, но произошла ошибка при отправке.");
  }
}
boot();
