import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, DocumentData, DocumentSnapshot, QuerySnapshot, updateDoc } from "firebase/firestore";
import "./styles/index.css";

const firebaseConfig = {
    apiKey: "AIzaSyBrDNbyBpmRoUSCTI-npFm1YIodzQNjIoA",
    authDomain: "wedding-site-c1fb0.firebaseapp.com",
    projectId: "wedding-site-c1fb0",
    storageBucket: "wedding-site-c1fb0.appspot.com",
    messagingSenderId: "514808349805",
    appId: "1:514808349805:web:59defead69d7da4e5aeb64",
    measurementId: "G-4HM7N72DF4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Drink data
const cocktailsData: string[] = ['Мохито', 'Базиликовый смэш', 'Апероль', 'Маргарита'];
const luxuryData: string[] = ['Водка', 'Виски', 'Вино', 'Абсент', 'Ром'];
const beerData: string[] = ['Корона', 'Heineken', 'Paulaner', 'Pilsner'];

async function addGuest(lastName: string, firstName: string): Promise<void> {
    try {
        const guestRef = doc(db, "guests", `${lastName}_${firstName}`);
        const docSnap = await getDoc(guestRef);

        if (!docSnap.exists()) {
            await setDoc(guestRef, { lastName, firstName });
            console.log(`Guest ${lastName} ${firstName} added`);
        } else {
            console.log(`Guest ${lastName} ${firstName} already exists`);
        }
    } catch (error) {
        console.error("Error adding guest:", error);
    }
}

function updateGuestListInHTML(guest: { lastName: string; firstName: string }): void {
    const guestList = document.getElementById("guestList");
    if (!guestList) return;

    const row = document.createElement("tr");

    const lastNameCell = document.createElement("td");
    lastNameCell.textContent = guest.lastName;
    row.appendChild(lastNameCell);

    const firstNameCell = document.createElement("td");
    firstNameCell.textContent = guest.firstName;
    row.appendChild(firstNameCell);

    guestList.appendChild(row);
}

function initializeGuestList(): void {
    const guestsCollection = collection(db, "guests");

    onSnapshot(guestsCollection, (snapshot: QuerySnapshot<DocumentData>) => {
        const guestList = document.getElementById("guestList");
        if (!guestList) return;

        guestList.innerHTML = "";

        snapshot.forEach((doc: DocumentSnapshot<DocumentData>) => {
            const guest = doc.data() as { lastName: string; firstName: string };
            updateGuestListInHTML(guest);
        });
    });
}

document.getElementById("addGuestBtn")?.addEventListener("click", async () => {
    const lastName = (document.getElementById("lastName") as HTMLInputElement).value;
    const firstName = (document.getElementById("firstName") as HTMLInputElement).value;

    if (lastName && firstName) {
        await addGuest(lastName, firstName);
        (document.getElementById("lastName") as HTMLInputElement).value = "";
        (document.getElementById("firstName") as HTMLInputElement).value = "";
    } else {
        alert("Пожалуйста, введите фамилию и имя гостя");
    }
});

initializeGuestList();

async function initializeFirestoreData(): Promise<void> {
    const categories = {
        cocktails: cocktailsData,
        luxury: luxuryData,
        beer: beerData,
    };

    try {
        for (const [category, drinks] of Object.entries(categories)) {
            for (const drink of drinks) {
                const drinkRef = doc(db, category, drink.replace(/\s+/g, '_'));
                const docSnap = await getDoc(drinkRef);

                if (!docSnap.exists()) {
                    await setDoc(drinkRef, { count: 0 });
                }
            }
        }
        console.log('Firestore data initialized');
    } catch (error) {
        console.error('Error initializing Firestore data:', error);
    }
}

async function updateDrinkCount(drink: string, category: string): Promise<void> {
    try {
        const drinkRef = doc(db, category, drink.replace(/\s+/g, '_'));
        const docSnap = await getDoc(drinkRef);

        if (docSnap.exists()) {
            const currentCount = docSnap.data()?.count || 0;
            await updateDoc(drinkRef, { count: currentCount + 1 });
            console.log(`Updated ${drink} in ${category}: new count ${currentCount + 1}`);
        } else {
            await setDoc(drinkRef, { count: 1 });
            console.log(`Set ${drink} in ${category}: new count 1`);
        }
    } catch (error) {
        console.error('Ошибка при обновлении количества голосов:', error);
    }
}

async function initializeResults(): Promise<void> {
    try {
        const categories: string[] = ['cocktails', 'luxury', 'beer'];

        for (const category of categories) {
            const drinks = category === 'cocktails' ? cocktailsData :
                category === 'luxury' ? luxuryData :
                category === 'beer' ? beerData : [];

            for (const drink of drinks) {
                const drinkRef = doc(db, category, drink.replace(/\s+/g, '_'));
                const docSnap = await getDoc(drinkRef);

                if (docSnap.exists()) {
                    const count = docSnap.data()?.count || 0;
                    const countElement = document.getElementById(`${drink.toLowerCase().replace(/\s+/g, '-')}-count`);
                    if (countElement) {
                        countElement.innerText = `${count} человек`;
                    }
                }
            }
        }
    } catch (error) {
        console.error('Ошибка получения результатов опроса:', error);
    }
}

function updateResultInHTML(drink: string, count: number): void {
    const countElement = document.getElementById(`${drink.toLowerCase().replace(/\s+/g, '-')}-count`);
    if (countElement) {
        countElement.innerText = `${count} человек`;
    }
}

initializeFirestoreData();
initializeResults();

const surveyForm = document.getElementById('survey-form');

surveyForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);

    try {
        const cocktailDrinks = formData.getAll('cocktail');
        for (const drink of cocktailDrinks) {
            await updateDrinkCount(drink.toString(), 'cocktails');
        }

        const luxuryDrinks = formData.getAll('luxury');
        for (const drink of luxuryDrinks) {
            await updateDrinkCount(drink.toString(), 'luxury');
        }

        const beerDrinks = formData.getAll('beer');
        for (const drink of beerDrinks) {
            await updateDrinkCount(drink.toString(), 'beer');
        }

        localStorage.setItem('hasVoted', 'true');
        initializeResults();
        document.getElementById('results')?.classList.remove('hidden');
        (document.querySelector('.survey-button') as HTMLElement).style.display = 'none';
    } catch (error) {
        console.error('Ошибка при обновлении количества голосов:', error);
    }
});

const categories = ['cocktails', 'luxury', 'beer'];

categories.forEach(category => {
    const drinks = category === 'cocktails' ? cocktailsData :
        category === 'luxury' ? luxuryData :
        category === 'beer' ? beerData : [];

    drinks.forEach((drink) => {
        const drinkRef = doc(db, category, drink.replace(/\s+/g, '_'));
        onSnapshot(drinkRef, (docSnapshot: DocumentSnapshot<DocumentData>) => {
            if (docSnapshot.exists()) {
                const count = docSnapshot.data()?.count || 0;
                updateResultInHTML(drink, count);
            }
        });
    });
});
