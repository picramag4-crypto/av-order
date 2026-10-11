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

let loyaltyPoints = 0;


function getGoodsSubtotal() {
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  const redeemInput = document.getElementById("loyaltyRedeemInput");
  const requested = Math.max(
    0,
    Math.floor(Number(redeemInput?.value) || 0)
  );

  // Если клиент хочет списать баллы,
  // обеденная скидка не применяется.
  if (requested > 0) {
    return subtotal;
  }

  return lunchDiscountActive()
    ? subtotal - Math.round(subtotal * 0.2)
    : subtotal;
}



async function loadLoyalty() {
  if (!tg?.initData) return;

  try {
    const response = await fetch(
      "/api/loyalty?initData=" + encodeURIComponent(tg.initData)
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      console.error("Не удалось загрузить бонусы:", data);
      return;
    }

    loyaltyPoints = Math.max(0, Number(data.points) || 0);
    
const balance = document.getElementById("loyaltyBalance");
const maxRedeem = document.getElementById("loyaltyMaxRedeem");

if (balance) {
  balance.textContent = loyaltyPoints + " ₽";
}

if (maxRedeem) {
  maxRedeem.textContent =
    "Сейчас можно списать до " + getMaxRedeem() + " ₽";
}

updateCart();


    const card = document.getElementById("loyaltyCard");
const hint = document.getElementById("loyaltyHint");

    if (card) card.classList.remove("hidden");
    

    if (hint) {
      hint.textContent = "Бонусами можно оплатить до 20% стоимости товаров.";
    }

    } catch (error) {
    console.error("Loyalty error:", error);
  }
}
async function loadLoyaltyHistory() {
  const list = document.getElementById("loyaltyHistoryList");
  const panel = document.getElementById("loyaltyHistoryPanel");

  if (!list || !panel || !tg?.initData) return;

  panel.classList.remove("hidden");
  list.textContent = "Загружаем историю…";

  try {
    const response = await fetch(
      "/api/loyalty-history?initData=" +
      encodeURIComponent(tg.initData),
      { cache: "no-store" }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      list.textContent = "Не удалось загрузить историю. Попробуйте позже.";
      return;
    }

    list.replaceChildren();

    if (!data.history.length) {
      list.textContent = "Пока операций нет. Первые бонусы появятся после выдачи заказа.";
      return;
    }

    data.history.forEach(item => {
      const row = document.createElement("div");
      row.className = "loyalty-history-item";

      const info = document.createElement("div");
      const title = document.createElement("strong");
      const date = document.createElement("div");
      date.className = "small";

      const operationNames = {
        earn: "⭐ Начисление бонусов",
        redeem: "🎁 Списание бонусов",
        refund: "↩️ Возврат бонусов"
      };

      title.textContent =
        operationNames[item.operation] || "Операция с бонусами";

      const parsedDate = new Date(item.createdAt);
      date.textContent = Number.isNaN(parsedDate.getTime())
        ? ""
        : parsedDate.toLocaleString("ru-RU");

      info.append(title, date);

      const amount = document.createElement("strong");
      const sign = item.operation === "redeem" ? "−" : "+";
      amount.textContent = sign + rub(item.points);
      amount.className =
        item.operation === "redeem"
          ? "loyalty-history-negative"
          : "loyalty-history-positive";

      row.append(info, amount);
      list.appendChild(row);
    });
  } catch (error) {
    console.error("Loyalty history error:", error);
    list.textContent = "Ошибка загрузки истории. Попробуйте позже.";
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
  const option=modalItem.options?.[modalOptionIndex];
  const key=modalItem.name+"__"+(option?.label||"");
  const found=cart.find(x=>x.key===key);

  if(found) {
    found.qty++;
  } else {
    cart.push({
      key,
      name: modalItem.name,
      category: modalItem.category,
      option: option?.label || "",
      price: option?.price ?? modalItem.price,
      qty: 1
    });
  }

  document.getElementById("modal").classList.add("hidden");
  updateCart();
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



const loyaltyDiscount = getRedeemAmount();

const discountActive =
  lunchDiscountActive() && loyaltyDiscount === 0;

const lunchSub = discountActive
  ? sub - Math.round(sub * 0.2)
  : sub;

const goodsTotal = Math.max(
  0,
  lunchSub - loyaltyDiscount
);



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
  discountActive
    ? rub(lunchSub) + "  (скидка −20%)"
    : rub(sub);


document.getElementById("deliveryFee").textContent =
  isDelivery && goodsTotal >= 2000
    ? "Бесплатно"
    : rub(delivery);

document.getElementById("total").textContent =
  rub(goodsTotal + delivery);
  

  // === ДОПРОДАЖИ В КОРЗИНЕ ===
  const upsellBox = document.createElement("div");

  upsellBox.style.cssText =
    "margin-top:18px;padding:14px;background:#f5f1eb;border-radius:14px;color:#222;";

  const hasBurgerOrRoll = cart.some(item =>
    /бургер|ролл|чиабатт/i.test(item.name) ||
    /бургеры|роллы|чиабатты/i.test(item.category || "")
  );

  const hasCoffee = cart.some(item =>
    ["Кофе", "Холодный кофе", "Авторский кофе"].includes(item.category) ||
    /эспрессо|американо|капучино|латте|раф|флэт уайт|бамбл/i.test(item.name)
  );

  const upsellItems = [];

  if (hasBurgerOrRoll) {
    upsellItems.push({
      name: "Картофель фри",
      emoji: "🍟",
      subtitle: "Хрустящий гарнир"
    });
  }

  if (hasCoffee) {
    upsellItems.push(
      {
        name: "Профитроль дубайский",
        emoji: "🍫",
        subtitle: "Десерт к кофе"
      },
      {
        name: "Тарталетка «Яблоко-Корица»",
        emoji: "🍎",
        subtitle: "Нежная яблочная начинка"
      },
      {
        name: "Чизкейк в ассортименте",
        emoji: "🍰",
        subtitle: "Выберите любимый вкус"
      }
    );
  }

  if (upsellItems.length > 0) {
    upsellBox.innerHTML = `
      <div style="font-size:17px;font-weight:700;margin-bottom:6px;">
        😋 Добавим что-нибудь вкусное?
      </div>
      <div style="font-size:13px;color:#666;margin-bottom:10px;">
        Отличное дополнение к вашему заказу
      </div>
    `;

    upsellItems.forEach(suggestion => {
      const item = menu.find(x => x.name === suggestion.name);
      if (!item) return;

      if (cart.some(x => x.name === item.name)) return;

      const price = item.options
        ? Math.min(...item.options.map(o => o.price))
        : item.price;

      const row = document.createElement("div");

      row.style.cssText =
        "display:flex;align-items:center;gap:10px;padding:11px 0;border-top:1px solid #ddd;";

      const emoji = document.createElement("div");
      emoji.textContent = suggestion.emoji;
      emoji.style.cssText =
        "width:44px;height:44px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#fff;border-radius:12px;font-size:25px;";

      const info = document.createElement("div");
      info.style.cssText = "flex:1;min-width:0;";

      const name = document.createElement("div");
      name.textContent = item.name;
      name.style.cssText =
        "font-size:13px;font-weight:700;line-height:1.35;";

      const subtitle = document.createElement("div");
      subtitle.textContent = suggestion.subtitle;
      subtitle.style.cssText =
        "font-size:11px;color:#777;margin-top:3px;";

      const priceEl = document.createElement("div");
      priceEl.textContent = "от " + rub(discountedAmount(price));
      priceEl.style.cssText =
        "font-size:13px;font-weight:700;margin-top:4px;";

      info.appendChild(name);
      info.appendChild(subtitle);
      info.appendChild(priceEl);

      const button = document.createElement("button");
      button.textContent = "+";
      button.setAttribute("aria-label", "Добавить " + item.name);
      button.style.cssText =
        "width:36px;height:36px;flex-shrink:0;border:0;border-radius:11px;background:#222;color:#fff;font-size:23px;";

      button.onclick = () => {
        if (item.options) {
          openItem(item);
          return;
        }

        cart.push({
          key: item.name + "__",
          name: item.name,
          category: item.category,
          option: "",
          price: item.price,
          qty: 1
        });

        updateCart();
      };

      row.appendChild(emoji);
      row.appendChild(info);
      row.appendChild(button);
      upsellBox.appendChild(row);
    });

    if (upsellBox.children.length > 2) {
      list.appendChild(upsellBox);
    }
  }
  // === КОНЕЦ ДОПРОДАЖ ===
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
  
const redeemInput = document.getElementById("loyaltyRedeemInput");
const redeemMaxBtn = document.getElementById("redeemMaxBtn");

if (redeemInput) {
  redeemInput.addEventListener("input", () => {
    updateCart();
  });
}

if (redeemMaxBtn) {
  redeemMaxBtn.addEventListener("click", () => {
    const input = document.getElementById("loyaltyRedeemInput");

    if (input) {
      input.value = getMaxRedeem();
      updateCart();
    }
  });
}

const historyButton = document.getElementById("loyaltyHistoryBtn");

if (historyButton) {
  historyButton.addEventListener("click", () => {
    const panel = document.getElementById("loyaltyHistoryPanel");

    if (panel && !panel.classList.contains("hidden")) {
      panel.classList.add("hidden");
      return;
    }

    loadLoyaltyHistory();
  });
}

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

 
const originalSubtotal = cart.reduce(
  (sum, item) => sum + item.price * item.qty,
  0
);


const loyaltyDiscount = getRedeemAmount();

const discountActive =
  lunchDiscountActive() && loyaltyDiscount === 0;

const discount = discountActive
  ? Math.round(originalSubtotal * 0.2)
  : 0;

const subtotalAfterLunch = originalSubtotal - discount;

const goodsTotal = Math.max(
  0,
  subtotalAfterLunch - loyaltyDiscount
);


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
      

{
  text: text,
  initData: tg?.initData || "",
  telegramUserId: tg?.initDataUnsafe?.user?.id || null,
  originalSubtotal: originalSubtotal,
  pointsToRedeem: loyaltyDiscount
}


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
