const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

let menu = [];
let cart = [];
let selectedCategory = "🍂 Осеннее меню";
const autumnItems = [
  "Бургер «Чикен Бекон»",
  "Картофель фри с беконом и соусом на выбор",
  "Бургер «Чили Моцарелла»",
  "Фалафель-Бургер «АВ»",
  "Салат «Чикен Барбекю»",
  "Тыквенный крем-суп с жареными креветками",
  "Драники с лососем",
  "Паста с креветками и соусом песто",
  "Тарталетка «Яблоко-Корица»",
  "Чай «Облепиха-Апельсин»",
  "Какао с маршмеллоу",
  "Тыквенный Раф",
  "Кленовый латте",
  "Раф «Синнабон»",
  "Глинтвейн Безалкогольный",
  "Чай Ягодный осенний",
  "Бамбл Вишневый"
];
let modalItem = null;
let modalOptionIndex = 0;


const rub = n => n.toLocaleString("ru-RU") + " ₽";
function lunchDiscountActive() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Moscow",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date());

  const hour = Number(
    parts.find(x => x.type === "hour").value
  );

  const weekday =
    parts.find(x => x.type === "weekday").value;

  const weekend =
    weekday === "Sat" || weekday === "Sun";

  return !weekend && hour >= 12 && hour < 16;
}

function discountedAmount(amount) {
  return lunchDiscountActive()
    ? Math.round(amount * 0.8)
    : amount;
}
function loyaltyDrinksCount() {
  const loyaltyCategories = [
    "Кофе",
    "Холодный кофе",
    "Авторский кофе",
    "Лимонады",
    "Чаи",
    "Милки"
  ];

  return cart
    .filter(item => loyaltyCategories.includes(item.category))
    .reduce((sum, item) => sum + item.qty, 0);
}
let loyaltyPosition = 0;

function loyaltyReward() {
  if (loyaltyPosition === 4) {
    return "discount20";
  }

  if (loyaltyPosition === 9) {
    return "free";
  }

  return null;
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
async function loadLoyalty() {
  const telegramUserId = tg?.initDataUnsafe?.user?.id;

  if (!telegramUserId) return;

  try {
    const response = await fetch(
      "/api/loyalty?telegramUserId=" +
      encodeURIComponent(telegramUserId)
    );

    const data = await response.json();

    if (!response.ok || !data.ok) return;

    const count = Number(data.drinksCount || 0);
    const position = count % 10;
    loyaltyPosition = position;

    const card = document.getElementById("loyaltyCard");
    const progress = document.getElementById("loyaltyProgress");
    const hint = document.getElementById("loyaltyHint");

    if (!(card && progress && hint)) return;

    card.classList.remove("hidden");
    progress.textContent = position + " из 10";

    if (position === 4) {
      hint.textContent = "🎉 Следующий напиток со скидкой 20%";
    } else if (position === 9) {
      hint.textContent = "🎁 Следующий напиток бесплатно";
    } else if (position < 4) {
      hint.textContent =
        "До скидки 20% осталось: " + (4 - position);
    } else {
      hint.textContent =
        "До бесплатного напитка осталось: " + (9 - position);
    }

  } catch (error) {
    console.error("Loyalty error:", error);
  }
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
  loadLoyalty();
}
function categories(){
  return ["🍂 Осеннее меню", ...[...new Set(menu.map(x=>x.category))]];
}

function renderCategories(){
  const box=document.getElementById("categories");
  box.innerHTML="";

  categories().forEach(c=>{
    const b=document.createElement("button");
    b.textContent=c;
    b.className=c===selectedCategory?"active":"";

    b.onclick=()=>{
      selectedCategory=c;
      renderCategories();
      renderMenu();
      window.scrollTo({top:0,behavior:"smooth"});
    };

    box.appendChild(b);
  });
}

function renderMenu(){
  const box=document.getElementById("menu");
  box.innerHTML="";

  const items = selectedCategory === "🍂 Осеннее меню"
    ? menu.filter(x => autumnItems.includes(x.name))
    : menu.filter(x => x.category === selectedCategory);

  items.forEach((item,idx)=>{
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
  modalItem=item;
  modalOptionIndex=0;

  document.getElementById("modalTitle").textContent=item.name;
  document.getElementById("modalDesc").textContent=item.description||"";

  const opts=document.getElementById("modalOptions");
  opts.innerHTML="";

  if(item.options){
    item.options.forEach((o,i)=>{
      const label=document.createElement("label");
      label.className="option";

      label.innerHTML=
        `<input type="radio" name="itemOption" ${i===0?"checked":""}> ${o.label} — ${rub(o.price)}`;

      label.querySelector("input").onchange=()=>modalOptionIndex=i;
      opts.appendChild(label);
    });
  }

  document.getElementById("modal").classList.remove("hidden");
}

function openQuickPick(name){
  let item = menu.find(x => x.name === name);

  if(!item){
    item = menu.find(x =>
      x.name.includes("Чили Моцарелла") &&
      name.includes("Чили Моцарелла")
    );
  }

  if(!item){
    item = menu.find(x =>
      x.name.includes("Чикен Бекон") &&
      name.includes("Чикен Бекон")
    );
  }

  if(!item){
    alert("Позиция временно недоступна");
    return;
  }

  openItem(item);
}

function addModalItem(){
  const addedItem = modalItem;
  const option = addedItem.options?.[modalOptionIndex];
  const key = addedItem.name + "__" + (option?.label || "");
  const found = cart.find(x => x.key === key);

  if(found) {
    found.qty++;
  } else {
    cart.push({
      key,
      name: addedItem.name,
      category: addedItem.category,
      option: option?.label || "",
      price: option?.price ?? addedItem.price,
      qty: 1
    });
  }

  document.getElementById("modal").classList.add("hidden");
  updateCart();

  const isBurger = addedItem.name.toLowerCase().includes("бургер");
  const alreadyHasFries = cart.some(x =>
    /фри/i.test(x.name)
  );

  if (isBurger && !alreadyHasFries) {
    showFriesOffer();
  }
}

function showFriesOffer() {
  const fries = menu.find(item =>
    /картофель фри/i.test(item.name)
  );

  if (!fries) return;

  const overlay = document.createElement("div");
  overlay.className = "av-success-overlay";
  overlay.style.zIndex = "9999";

  const price = fries.options
    ? Math.min(...fries.options.map(o => o.price))
    : fries.price;

  overlay.innerHTML = `
    <div class="av-success-card">
      <div style="font-size:42px;margin-bottom:12px">🍟</div>
      <h2>Добавим фри?</h2>
      <p>
        Хрустящая картошечка отлично дополнит ваш бургер.
        <br><br>
        <strong>${rub(price)}</strong>
      </p>
      <button type="button" class="av-fries-add">
        Добавить к заказу
      </button>
      <button type="button" class="av-fries-skip"
        style="margin-top:10px;background:transparent;color:#625e57">
        Не сейчас
      </button>
    </div>
  `;

  overlay.querySelector(".av-fries-add").onclick = () => {
    overlay.remove();
    openItem(fries);
  };

  overlay.querySelector(".av-fries-skip").onclick = () => {
    overlay.remove();
  };

  overlay.addEventListener("click", event => {
    if (event.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
}
function selectQuickCategory(category) {
  selectedCategory = category;
  renderCategories();
  renderMenu();

  document.getElementById("menu").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}
function updateCart(){
  document.getElementById("cartCount").textContent=cart.reduce((s,x)=>s+x.qty,0);
  const cartMeta = document.getElementById("cartMeta");

if (cartMeta) {
  const cartQty = cart.reduce((s,x) => s + x.qty, 0);
  const cartSum = cart.reduce((s,x) => s + x.price * x.qty, 0);

  const word =
    cartQty === 1 ? "позиция" :
    cartQty >= 2 && cartQty <= 4 ? "позиции" :
    "позиций";

  cartMeta.textContent =
    cartQty + " " + word + " · " + rub(cartSum);
}
  const list=document.getElementById("cartItems");
  list.innerHTML="";
  cart.forEach((x,i)=>{
    const row=document.createElement("div");
    row.className="cart-row";
    row.innerHTML=`
  <div>
    <strong>${x.name}</strong>
    <div class="small">${x.option}</div>
    <div>${rub(x.price*x.qty)}</div>
  </div>

  <div class="qty">
    <button data-act="minus">−</button>
    <span>${x.qty}</span>
    <button data-act="plus">+</button>
    <button data-act="delete" class="cart-delete">🗑</button>
  </div>
`;
    row.querySelector('[data-act="minus"]').onclick=()=>{x.qty--;if(x.qty<=0)cart.splice(i,1);updateCart()};
    row.querySelector('[data-act="plus"]').onclick=()=>{x.qty++;updateCart()};
    row.querySelector('[data-act="delete"]').onclick=()=>{
  cart.splice(i,1);
  updateCart();
};
    list.appendChild(row);
  });
  const sub = cart.reduce((s,x) => s + x.price * x.qty, 0);

const lunchSub = discountedAmount(sub);

const loyaltyItems = cart.filter(item =>
  [
    "Кофе",
    "Холодный кофе",
    "Авторский кофе",
    "Лимонады",
    "Чаи",
    "Милки"
  ].includes(item.category)
);

let loyaltyDiscount = 0;

if (loyaltyItems.length > 0) {
  const cheapestDrinkPrice = Math.min(
    ...loyaltyItems.map(item => item.price)
  );

  if (loyaltyReward() === "discount20") {
    if (!lunchDiscountActive()) {
      loyaltyDiscount = Math.round(cheapestDrinkPrice * 0.2);
    }
  }

  if (loyaltyReward() === "free") {
    if (lunchDiscountActive()) {
      loyaltyDiscount = Math.round(cheapestDrinkPrice * 0.8);
    } else {
      loyaltyDiscount = cheapestDrinkPrice;
    }
  }
}

const goodsTotal = lunchSub - loyaltyDiscount;

const isDelivery =
  document.querySelector('input[name="fulfillment"]:checked')?.value === "delivery";

const freeDeliveryLimit = 2000;
const progressBox = document.getElementById("deliveryProgress");
const progressFill = document.getElementById("deliveryProgressFill");
const progressText = document.getElementById("deliveryProgressText");
const progressAmount = document.getElementById("deliveryProgressAmount");

if (isDelivery) {
  progressBox.classList.remove("hidden");

  const progress = Math.min(goodsTotal / freeDeliveryLimit, 1);
  progressFill.style.width = (progress * 100) + "%";

  if (goodsTotal >= freeDeliveryLimit) {
    progressText.textContent = "🎉 Бесплатная доставка!";
    progressAmount.textContent =
      rub(freeDeliveryLimit) + " / " + rub(freeDeliveryLimit);
  } else {
    const remaining = freeDeliveryLimit - goodsTotal;

    progressText.textContent =
      "До бесплатной доставки осталось " + rub(remaining);

    progressAmount.textContent =
      rub(goodsTotal) + " / " + rub(freeDeliveryLimit);
  }
} else {
  progressBox.classList.add("hidden");
}
const delivery =
  isDelivery
    ? (goodsTotal >= 2000 ? 0 : 200)
    : 0;

const loyaltyRow = document.getElementById("loyaltyDiscountRow");
const loyaltyValue = document.getElementById("loyaltyDiscount");

if (loyaltyDiscount > 0) {
  loyaltyRow.classList.remove("hidden");
  loyaltyValue.textContent = "−" + rub(loyaltyDiscount);
} else {
  loyaltyRow.classList.add("hidden");
}

document.getElementById("subtotal").textContent =
  lunchDiscountActive()
    ? rub(lunchSub) + "  (скидка −20%)"
    : rub(sub);

document.getElementById("deliveryFee").textContent =
  isDelivery && goodsTotal >= 2000
    ? "Бесплатно"
    : rub(delivery);

document.getElementById("total").textContent =
  rub(goodsTotal + delivery);
}
function bind(){
    const checkoutBtn = document.getElementById("checkoutBtn");
  if (checkoutBtn) {
    checkoutBtn.onclick = checkout;
    console.log("Кнопка оформления подключена");
  } else {
    console.error("Не найдена кнопка checkoutBtn");
  }
  document.getElementById("openCart").onclick=()=>{updateCart();document.getElementById("cartDrawer").classList.remove("hidden")};
  document.getElementById("closeCart").onclick=()=>document.getElementById("cartDrawer").classList.add("hidden");
  document.getElementById("modalClose").onclick=()=>document.getElementById("modal").classList.add("hidden");
  document.getElementById("modalAdd").onclick=addModalItem;
  document.querySelectorAll('input[name="fulfillment"]').forEach(r=>r.onchange=()=>{
    const isDel=document.querySelector('input[name="fulfillment"]:checked').value==="delivery";
    document.getElementById("deliveryFields").classList.toggle("hidden",!isDel);
    updateCart();
  });
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

const loyaltyItems = cart.filter(item =>
  [
    "Кофе",
    "Холодный кофе",
    "Авторский кофе",
    "Лимонады",
    "Чаи",
    "Милки"
  ].includes(item.category)
);

let loyaltyDiscount = 0;

if (loyaltyItems.length > 0) {
  const cheapestDrinkPrice = Math.min(
    ...loyaltyItems.map(item => item.price)
  );

  if (loyaltyReward() === "discount20") {
    if (!discountActive) {
      loyaltyDiscount = Math.round(cheapestDrinkPrice * 0.2);
    }
  }

  if (loyaltyReward() === "free") {
    if (discountActive) {
      loyaltyDiscount = Math.round(cheapestDrinkPrice * 0.8);
    } else {
      loyaltyDiscount = cheapestDrinkPrice;
    }
  }
}

const goodsTotal =
  originalSubtotal -
  discount -
  loyaltyDiscount;

const fee =
  fulfillment === "delivery"
    ? (goodsTotal >= 2000 ? 0 : 200)
    : 0;

const order = {
  createdAt: new Date().toISOString(),
  customer: { name, phone, address, comment },
  fulfillment,
  payment,
  items: cart,
  originalSubtotal,
discount,
loyaltyDiscount,
subtotal: goodsTotal,
deliveryFee: fee,
total: goodsTotal + fee
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
(loyaltyDiscount > 0
  ? "\n🎁 Карта лояльности: −" + rub(loyaltyDiscount)
  : "") +
(fulfillment === "delivery"
  ? "\n🚗 Доставка: " + (fee === 0 ? "Бесплатно" : rub(fee))
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
  telegramUserId: tg?.initDataUnsafe?.user?.id || null,
  loyaltyDrinks: loyaltyDrinksCount()
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
    showOrderSuccess();
  } catch (error) {
    console.error(error);
    alert("Заказ сформирован, но произошла ошибка при отправке.");
  }
}

function showOrderSuccess() {
  const style = document.createElement("style");
  style.textContent = `
    .av-success-overlay {
      position: fixed;
      inset: 0;
      z-index: 99999;
      background: rgba(20, 20, 20, 0.72);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .av-success-card {
      width: 100%;
      max-width: 340px;
      box-sizing: border-box;
      background: #f7f3ed;
      color: #292723;
      border-radius: 22px;
      padding: 30px 22px 24px;
      text-align: center;
      font-family: inherit;
      box-shadow: 0 15px 50px rgba(0,0,0,.25);
      animation: avPop .22s ease-out;
    }
    .av-success-icon {
      width: 66px;
      height: 66px;
      margin: 0 auto 18px;
      border-radius: 50%;
      background: #dce8d9;
      color: #3e6945;
      font-size: 36px;
      line-height: 66px;
      font-weight: bold;
    }
    .av-success-card h2 {
      margin: 0 0 10px;
      font-size: 24px;
    }
    .av-success-card p {
      margin: 0 0 24px;
      font-size: 15px;
      line-height: 1.5;
      color: #625e57;
    }
    .av-success-card button {
      width: 100%;
      border: 0;
      border-radius: 13px;
      padding: 15px;
      background: #292723;
      color: white;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
    }
    @keyframes avPop {
      from { opacity: 0; transform: scale(.94); }
      to { opacity: 1; transform: scale(1); }
    }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.className = "av-success-overlay";
  overlay.innerHTML = `
    <div class="av-success-card">
      <div class="av-success-icon">✓</div>
      <h2>Заказ принят!</h2>
      <p>
        Спасибо, что выбрали АВ ❤️<br>
        Мы получили ваш заказ и уже передали его сотрудникам.
      </p>
      <button type="button">Отлично</button>
    </div>
  `;

  overlay.querySelector("button").addEventListener("click", () => {
    overlay.remove();
    style.remove();
  });

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      overlay.remove();
      style.remove();
    }
  });

  document.body.appendChild(overlay);
}
boot();
