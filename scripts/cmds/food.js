module.exports = {
    config: {
        name: "food",
        author: "Raphael Scholar",
        version: "1.1.0",
        role: 0,
        shortDescription: "Get food and drink information",
        longDescription: "Get detailed information about any food or drink, including images, recipes, and cultural details",
        category: "utility",
        guide: "{prefix}food [name]\nExample: {prefix}food sushi\n{prefix}food recipe pizza"
    },
    onStart: async function ({ api, event, args }) {
        const axios = require("axios");
        
        if (!args[0]) {
            return api.sendMessage("Please specify a food or drink name!\nExample: !food sushi", event.threadID);
        }

        const query = args.join(" ");
        const isRecipe = query.toLowerCase().startsWith("recipe");
        const searchTerm = isRecipe ? query.slice(7) : query;

        try {
            if (isRecipe) {
                const APP_ID = "56859ccb";
                const APP_KEY = "00c03dda1d75cbbbe9de701b9773f77f	—";
                
                const response = await axios.get(`https://api.edamam.com/search?q=${encodeURIComponent(searchTerm)}&app_id=${APP_ID}&app_key=${APP_KEY}&from=0&to=1`);
                
                if (!response.data.hits || response.data.hits.length === 0) {
                    return api.sendMessage("❌ No recipe found for this food item.", event.threadID);
                }

                const recipe = response.data.hits[0].recipe;
                const healthLabels = recipe.healthLabels.slice(0, 3).join(", ");
                const dietLabels = recipe.dietLabels.join(", ");

                let recipeText = `🍳 ${recipe.label}\n\n`;
                recipeText += `👥 Serves: ${Math.round(recipe.yield)} people\n`;
                recipeText += `🔥 Calories per serving: ${Math.round(recipe.calories/recipe.yield)}\n\n`;
                
                if (dietLabels) recipeText += `📋 Diet: ${dietLabels}\n`;
                if (healthLabels) recipeText += `❤️ Health: ${healthLabels}\n\n`;
                
                recipeText += "📝 Main Ingredients:\n";
                recipeText += recipe.ingredientLines.slice(0, 8).join("\n");
                
                if (recipe.ingredientLines.length > 8) {
                    recipeText += "\n... and more ingredients";
                }
                
                recipeText += `\n\n🌐 Full recipe: ${recipe.url}`;

                const recipeMsg = {
                    body: recipeText,
                    attachment: await global.utils.getStreamFromURL(recipe.image)
                };
                
                return api.sendMessage(recipeMsg, event.threadID);

            } else {
                const mealResponse = await axios.get(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(searchTerm)}`);
                
                if (!mealResponse.data.meals || mealResponse.data.meals.length === 0) {
                    const drinkResponse = await axios.get(`https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${encodeURIComponent(searchTerm)}`);
                    
                    if (!drinkResponse.data.drinks || drinkResponse.data.drinks.length === 0) {
                        return api.sendMessage("❌ No information found for this food/drink item.", event.threadID);
                    }

                    const drink = drinkResponse.data.drinks[0];
                    const ingredients = [];
                    
                    for (let i = 1; i <= 15; i++) {
                        if (drink[`strIngredient${i}`]) {
                            ingredients.push(`• ${drink[`strIngredient${i}`]} ${drink[`strMeasure${i}`] ? `- ${drink[`strMeasure${i}`]}` : ""}`);
                        }
                    }

                    const drinkMsg = {
                        body: `🍹 ${drink.strDrink}\n\n` +
                              `📝 Category: ${drink.strCategory}\n` +
                              `🥃 Glass: ${drink.strGlass}\n` +
                              `🌍 Type: ${drink.strAlcoholic}\n\n` +
                              `📋 Ingredients:\n${ingredients.join("\n")}\n\n` +
                              `👩‍🍳 Instructions:\n${drink.strInstructions}`,
                        attachment: await global.utils.getStreamFromURL(drink.strDrinkThumb)
                    };

                    return api.sendMessage(drinkMsg, event.threadID);
                }

                const meal = mealResponse.data.meals[0];
                const ingredients = [];
                
                for (let i = 1; i <= 20; i++) {
                    if (meal[`strIngredient${i}`]) {
                        ingredients.push(`• ${meal[`strIngredient${i}`]} ${meal[`strMeasure${i}`] ? `- ${meal[`strMeasure${i}`]}` : ""}`);
                    }
                }

                const mealMsg = {
                    body: `🍽️ ${meal.strMeal}\n\n` +
                          `🌍 Origin: ${meal.strArea}\n` +
                          `📝 Category: ${meal.strCategory}\n\n` +
                          `📋 Main Ingredients:\n${ingredients.slice(0, 8).join("\n")}\n` +
                          (ingredients.length > 8 ? "... and more ingredients\n\n" : "\n\n") +
                          `🎥 Tutorial: ${meal.strYoutube || "Not available"}`,
                    attachment: await global.utils.getStreamFromURL(meal.strMealThumb)
                };

                return api.sendMessage(mealMsg, event.threadID);
            }
        } catch (error) {
            return api.sendMessage("❌ An error occurred while fetching food information. Please try again.", event.threadID);
        }
    }
};

