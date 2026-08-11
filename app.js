const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

let menu = [];
let cart = [];
let selectedCategory = "Бургеры";
let modalItem = null;
let modalOptionIndex = 0;


const rub = n => n.toLocaleString("ru-RU") + " ₽";
function lunchDiscountActive() {
  const parts = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date());

  const hour = Number(parts.find(x => x.type === "hour").value);

  return hour >= 12 && hour < 16;
}

function discountedAmount(amount) {
  return lunchDiscountActive()
    ? Math.round(amount * 0.8)
    : amount;
}
function updatePromoTimer() {
  const timer = document.getElementById("promoTimer");
  const promo = document.getElementById("lunchPromo");

  if (!timer || !promo) return;

  if (!lunchDiscountActive()) {
    promo.classList.add("hidden");
    return;
  }

  const now = new Date();

  const moscowParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(now);

  const values = {};

  moscowParts.forEach(part => {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  });

  const nowMoscow = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );

  const endMoscow = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    16,
    0,
    0
  );

  let diff = Math.max(0, endMoscow - nowMoscow);

  const hours = Math.floor(diff / 3600000);
  diff %= 3600000;

  const minutes = Math.floor(diff / 60000);
  diff %= 60000;

  const seconds = Math.floor(diff / 1000);

  timer.textContent =
    "До конца акции: " +
    String(hours).padStart(2, "0") + ":" +
    String(minutes).padStart(2, "0") + ":" +
    String(seconds).padStart(2, "0");
}
async function boot(){
  menu = await fetch("menu.json").then(r=>r.json());
  renderCategories();
  renderMenu();
  bind();
  const promo = document.getElementById("lunchPromo");

if (promo) {
  promo.classList.toggle("hidden", !lunchDiscountActive());
}
  updatePromoTimer();
setInterval(updatePromoTimer, 1000);
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
    const originalPrice = item.options
  ? Math.min(...item.options.map(o => o.price))
  : item.price;

let priceHtml;

if (lunchDiscountActive()) {
  const newPrice = Math.round(originalPrice * 0.8);

  priceHtml =
    '<span class="old-price">' +
    (item.options ? "от " : "") +
    rub(originalPrice) +
    '</span> ' +
    '<span class="promo-price">' +
    (item.options ? "от " : "") +
    rub(newPrice) +
    '</span>';
} else {
  priceHtml =
    (item.options ? "от " : "") +
    rub(originalPrice);
}

card.innerHTML =
  `<h3>${item.name}</h3>
   <p>${item.description || ""}</p>
   <div class="card-footer">
     <span class="price">${priceHtml}</span>
     <button class="add">+</button>
   </div>`;
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
  const sub = cart.reduce((s,x) => s + x.price * x.qty, 0);
const discountedSub = discountedAmount(sub);
const delivery =
  document.querySelector('input[name="fulfillment"]:checked')?.value === "delivery"
    ? 200
    : 0;

document.getElementById("subtotal").textContent =
  lunchDiscountActive()
    ? rub(discountedSub) + "  (скидка −20%)"
    : rub(sub);

document.getElementById("deliveryFee").textContent = rub(delivery);
document.getElementById("total").textContent = rub(discountedSub + delivery);
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

  const originalSubtotal = cart.reduce((s,x) => s + x.price * x.qty, 0);

const discountActive = lunchDiscountActive();

const discount = discountActive
  ? Math.round(originalSubtotal * 0.2)
  : 0;

const subtotal = originalSubtotal - discount;
const fee = fulfillment === "delivery" ? 200 : 0;

const order = {
  createdAt: new Date().toISOString(),
  customer: { name, phone, address, comment },
  fulfillment,
  payment,
  items: cart,
  originalSubtotal,
  discount,
  subtotal,
  deliveryFee: fee,
  total: subtotal + fee
};
  localStorage.setItem("av_last_order",JSON.stringify(order));

  let text =
  "👤 Клиент: " + name + "\n" +
  "📞 Телефон: " + phone + "\n\n" +

  "🛍 ЗАКАЗ:\n" +
  cart.map(x =>
    x.qty + "× " +
    x.name +
    (x.option ? " (" + x.option + ")" : "") +
    " — " +
    rub(x.price * x.qty)
  ).join("\n") +

  "\n\n💵 Товары: " + rub(originalSubtotal) +

  (discountActive
    ? "\n🔥 Скидка 20% (12:00–16:00 МСК): −" + rub(discount)
    : "") +

  (fulfillment === "delivery"
    ? "\n🚗 Доставка: " + rub(fee)
    : "\n🚶 Самовывоз") +

  "\n💰 ИТОГО: " + rub(order.total) +

  (fulfillment === "delivery"
    ? "\n\n📍 Адрес: " + address
    : "\n\n📍 Самовывоз: Вокзальная площадь, 1А (вход со стороны вокзала)") +

  "\n\n💳 Оплата: " +
  (payment === "cash"
    ? "Наличными при получении"
    : "QR-кодом при получении") +

  "\n\n💬 Комментарий: " + (comment || "Нет");
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
    alert(
  "✅ Заказ успешно оформлен!\n\n" +
  "Мы получили ваш заказ и передали его сотрудникам.\n" +
  "Подробности заказа отправлены вам в Telegram."
);
  } catch (error) {
    console.error(error);
    alert("Заказ сформирован, но произошла ошибка при отправке.");
  }
}
boot();
