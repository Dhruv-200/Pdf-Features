"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

type ThemeContextType = {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    // Always start with "dark" to match server render
    // The inline script in layout.tsx will set the correct theme before React hydrates
    const [theme, setThemeState] = useState<Theme>("dark");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Only read from DOM/localStorage after mount to avoid hydration mismatch
        setMounted(true);
        if (typeof window !== "undefined") {
            // Read from DOM class set by inline script
            const currentTheme = document.documentElement.classList.contains("dark")
                ? "dark"
                : "light";
            setThemeState(currentTheme);
        }
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const root = document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(theme);
        localStorage.setItem("theme", theme);
    }, [theme]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
    };

    const toggleTheme = () => {
        setThemeState((prev) => {
            const newTheme = prev === "light" ? "dark" : "light";
            // Immediately update the DOM
            if (typeof window !== "undefined") {
                const root = document.documentElement;
                root.classList.remove("light", "dark");
                root.classList.add(newTheme);
                localStorage.setItem("theme", newTheme);
            }
            return newTheme;
        });
    };

    // Always provide the context, even before mounted
    // This prevents the "useTheme must be used within a ThemeProvider" error
    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}

