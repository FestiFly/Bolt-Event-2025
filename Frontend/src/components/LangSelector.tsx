import React from 'react';
import { useTranslation } from 'react-i18next';

const LangSelector = () => {
    const { t, i18n } = useTranslation();

    const changeLanguage = (e: React.ChangeEvent<HTMLSelectElement>) => {
        i18n.changeLanguage(e.target.value);
    };

    return (
        <div className="fixed bottom-5 left-5 z-50">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-1 rounded-full shadow-md hover:shadow-lg transition">
                <select
                    onChange={changeLanguage}
                    value={i18n.language}
                    className="bg-white text-black text-sm font-medium px-4 py-1 rounded-full appearance-none outline-none"
                >
                    <option value="en">🇺🇸 English</option>
                    <option value="ta">🇮🇳 தமிழ்</option>
                    <option value="hi">🇮🇳 हिंदी</option>
                </select>
            </div>
        </div>
    );
};

export default LangSelector;