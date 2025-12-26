import React, { useState, useEffect } from 'react';
import { Character } from '../types';
import * as apiService from '../services/apiService';
import CharacterList from './generator/CharacterList';
import CharacterCreator from './generator/CharacterCreator';
import { playSound } from '../services/soundService';

interface CharacterManagementProps {
    userEmail: string;
}

const CharacterManagement: React.FC<CharacterManagementProps> = ({ userEmail }) => {
    const [characters, setCharacters] = useState<Character[]>([]);
    const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
    const [showCreator, setShowCreator] = useState(false);
    const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        loadCharacters();
    }, [userEmail]);

    const loadCharacters = async () => {
        try {
            const chars = await apiService.getCharacters(userEmail);
            setCharacters(chars);
        } catch (e) {
            console.error('Failed to load characters:', e);
        }
    };

    const handleCreate = () => {
        setEditingCharacter(null);
        setShowCreator(true);
    };

    const handleEdit = (char: Character) => {
        setEditingCharacter(char);
        setShowCreator(true);
    };

    const handleSave = async (char: Character) => {
        try {
            await apiService.saveCharacter(userEmail, char);
            setFeedback({ message: 'Postava uložena!', type: 'success' });
            playSound('success');
            setShowCreator(false);
            await loadCharacters();
            setTimeout(() => setFeedback(null), 3000);
        } catch (e: any) {
            setFeedback({ message: `Chyba: ${e.message}`, type: 'error' });
            playSound('error');
            setTimeout(() => setFeedback(null), 3000);
        }
    };

    const handleDelete = async (characterId: string) => {
        try {
            await apiService.deleteCharacter(userEmail, characterId);
            setFeedback({ message: 'Postava smazána.', type: 'success' });
            playSound('success');
            setCharacters(prev => prev.filter(c => c.characterId !== characterId));
            setTimeout(() => setFeedback(null), 3000);
        } catch (e: any) {
            setFeedback({ message: `Chyba: ${e.message}`, type: 'error' });
            playSound('error');
            setTimeout(() => setFeedback(null), 3000);
        }
    };

    return (
        <div className="h-full w-full bg-black relative overflow-hidden">
            <CharacterList
                characters={characters}
                onCreate={handleCreate}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            {showCreator && (
                <CharacterCreator
                    character={editingCharacter}
                    onSave={handleSave}
                    onClose={() => setShowCreator(false)}
                />
            )}

            {feedback && (
                <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 rounded-xl border font-mono text-xs uppercase tracking-wider animate-in slide-in-from-bottom-4 ${feedback.type === 'success'
                    ? 'bg-green-950/90 border-green-500 text-green-400'
                    : 'bg-red-950/90 border-red-500 text-red-400'
                    }`}>
                    {feedback.message}
                </div>
            )}
        </div>
    );
};

export default CharacterManagement;
