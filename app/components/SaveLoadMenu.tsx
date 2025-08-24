"use client";

import { useState, useEffect, useCallback } from "react";
import { SaveManager } from "../lib/save-manager";
import type { GameSave } from "../lib/database";
import type { GameManager } from "../lib/game-manager";

interface SaveLoadMenuProps {
  gameManager: GameManager | null;
  playerNationId?: string;
  onGameLoaded?: (gameManager: GameManager) => void;
  onClose?: () => void;
  isVisible: boolean;
  defaultTab?: "save" | "load";
}

interface SaveLoadMenuState {
  saves: GameSave[];
  // loading: boolean;
  saveLoading: boolean;
  loadsLoading: boolean;
  activeTab: "save" | "load";
  saveName: string;
  message: string;
  messageType: "success" | "error" | "info" | "";
  showDeleteConfirm: number | null;
  includeScreenshot: boolean;
  quickSaveExists: boolean;
}

export default function SaveLoadMenu({
  gameManager,
  playerNationId,
  onGameLoaded,
  onClose,
  isVisible,
  defaultTab = "save",
}: SaveLoadMenuProps) {
  const [state, setState] = useState<SaveLoadMenuState>({
    saves: [],
    // loading: false, // too vague
    // be more specific:
    saveLoading: false,
    loadsLoading: false,
    activeTab: defaultTab,
    saveName: "",
    message: "",
    messageType: "",
    showDeleteConfirm: null,
    includeScreenshot: false,
    quickSaveExists: false,
  });

  const saveManager = gameManager ? new SaveManager(gameManager) : null;

  // Load saves when component mounts or becomes visible
  const loadSaves = useCallback(async () => {
    if (!saveManager) return;

    setState((prev) => ({ ...prev, loadsLoading: true }));

    try {
      const [saves, hasQuickSave] = await Promise.all([
        saveManager.getAllSaves(),
        saveManager.hasQuickSave(),
      ]);

      setState((prev) => ({
        ...prev,
        saves,
        quickSaveExists: hasQuickSave,
        loadsLoading: false,
      }));
    } catch (error) {
      console.error("Failed to load saves:", error);
      setState((prev) => ({
        ...prev,
        loadsLoading: false,
        message: "Failed to load save files",
        messageType: "error",
      }));
    }
  }, [saveManager]);

  useEffect(() => {
    if (isVisible && saveManager) {
      loadSaves();
    }
  }, [isVisible, saveManager, loadSaves]);

  // Reset active tab when defaultTab changes
  useEffect(() => {
    setState((prev) => ({ ...prev, activeTab: defaultTab }));
  }, [defaultTab]);

  const showMessage = useCallback(
    (message: string, type: "success" | "error" | "info") => {
      setState((prev) => ({ ...prev, message, messageType: type }));
      setTimeout(() => {
        setState((prev) => ({ ...prev, message: "", messageType: "" }));
      }, 3000);
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!saveManager) {
      showMessage("No active game to save", "error");
      return;
    }

    const name = state.saveName.trim();
    if (!name) {
      showMessage("Please enter a save name", "error");
      return;
    }

    setState((prev) => ({ ...prev, saveLoading: true }));

    try {
      const result = await saveManager.saveGame({
        name,
        includeScreenshot: state.includeScreenshot,
        playerNationId,
      });

      if (result.success) {
        showMessage(result.message, "success");
        setState((prev) => ({ ...prev, saveName: "" }));
        await loadSaves(); // Refresh the saves list
      } else {
        showMessage(result.message, "error");
      }
    } catch (error) {
      showMessage("Failed to save game", "error");
    } finally {
      setState((prev) => ({ ...prev, saveLoading: false }));
    }
  }, [
    saveManager,
    state.saveName,
    state.includeScreenshot,
    playerNationId,
    showMessage,
    loadSaves,
  ]);

  const handleQuickSave = useCallback(async () => {
    if (!saveManager) {
      showMessage("No active game to save", "error");
      return;
    }

    setState((prev) => ({ ...prev, saveLoading: true }));

    try {
      const result = await saveManager.quickSave(playerNationId);

      if (result.success) {
        showMessage(result.message, "success");
        setState((prev) => ({ ...prev, quickSaveExists: true }));
      } else {
        showMessage(result.message, "error");
      }
    } catch (error) {
      showMessage("Failed to quick save", "error");
    } finally {
      setState((prev) => ({ ...prev, saveLoading: false }));
    }
  }, [saveManager, playerNationId, showMessage]);

  const handleLoad = useCallback(
    async (saveId: number) => {
      if (!saveManager) {
        showMessage("Cannot load game", "error");
        return;
      }

      setState((prev) => ({ ...prev, loadsLoading: true }));

      try {
        const result = await saveManager.loadGame(saveId);

        if (result.success && result.gameManager) {
          showMessage(result.message, "success");
          onGameLoaded?.(result.gameManager);
          onClose?.();
        } else {
          showMessage(result.message, "error");
        }
      } catch (error) {
        showMessage("Failed to load game", "error");
      } finally {
        setState((prev) => ({ ...prev, loadsLoading: false }));
      }
    },
    [saveManager, onGameLoaded, onClose, showMessage]
  );

  const handleQuickLoad = useCallback(async () => {
    if (!saveManager) {
      showMessage("Cannot load game", "error");
      return;
    }

    setState((prev) => ({ ...prev, loadsLoading: true }));

    try {
      const result = await saveManager.loadQuickSave();

      if (result.success && result.gameManager) {
        showMessage(result.message, "success");
        onGameLoaded?.(result.gameManager);
        onClose?.();
      } else {
        showMessage(result.message, "error");
      }
    } catch (error) {
      showMessage("Failed to load quick save", "error");
    } finally {
      setState((prev) => ({ ...prev, loadsLoading: false }));
    }
  }, [saveManager, onGameLoaded, onClose, showMessage]);

  const handleDelete = useCallback(
    async (saveId: number) => {
      if (!saveManager) return;

      setState((prev) => ({ ...prev, saveLoading: true }));

      try {
        const result = await saveManager.deleteSave(saveId);

        if (result.success) {
          showMessage(result.message, "success");
          await loadSaves(); // Refresh the saves list
        } else {
          showMessage(result.message, "error");
        }
      } catch (error) {
        showMessage("Failed to delete save", "error");
      } finally {
        setState((prev) => ({
          ...prev,
          saveLoading: false,
          showDeleteConfirm: null,
        }));
      }
    },
    [saveManager, showMessage, loadSaves]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    },
    [onClose]
  );

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">Save & Load Game</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Message Display */}
        {state.message && (
          <div
            className={`px-6 py-3 text-sm ${
              state.messageType === "success"
                ? "bg-green-100 text-green-800"
                : state.messageType === "error"
                ? "bg-red-100 text-red-800"
                : "bg-blue-100 text-blue-800"
            }`}
          >
            {state.message}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setState((prev) => ({ ...prev, activeTab: "save" }))}
            className={`px-6 py-3 font-medium ${
              state.activeTab === "save"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Save Game
          </button>
          <button
            onClick={() => setState((prev) => ({ ...prev, activeTab: "load" }))}
            className={`px-6 py-3 font-medium ${
              state.activeTab === "load"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Load Game
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {state.activeTab === "save" ? (
            <div className="space-y-6">
              {/* Quick Save Section */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">Quick Save</h3>
                    <p className="text-sm text-gray-600">
                      {state.quickSaveExists
                        ? "Overwrites existing quick save"
                        : "No quick save exists"}
                    </p>
                  </div>
                  <button
                    onClick={handleQuickSave}
                    disabled={state.saveLoading || !gameManager}
                    className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium"
                  >
                    {state.saveLoading ? "Saving..." : "Quick Save"}
                  </button>
                </div>
              </div>

              {/* Regular Save Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Save Game</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Save Name
                    </label>
                    <input
                      type="text"
                      value={state.saveName}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          saveName: e.target.value,
                        }))
                      }
                      placeholder="Enter save name..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={state.saveLoading}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeScreenshot"
                      checked={state.includeScreenshot}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          includeScreenshot: e.target.checked,
                        }))
                      }
                      className="rounded"
                    />
                    <label
                      htmlFor="includeScreenshot"
                      className="text-sm text-gray-700"
                    >
                      Include screenshot (experimental)
                    </label>
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={
                      state.saveLoading ||
                      !gameManager ||
                      !state.saveName.trim()
                    }
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded-lg font-medium"
                  >
                    {state.saveLoading ? "Saving..." : "Save Game"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Quick Load Section */}
              {state.quickSaveExists && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">Quick Save</h3>
                      <p className="text-sm text-gray-600">
                        Load your most recent quick save
                      </p>
                    </div>
                    <button
                      onClick={handleQuickLoad}
                      disabled={state.loadsLoading}
                      className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium"
                    >
                      {state.loadsLoading ? "Loading..." : "Quick Load"}
                    </button>
                  </div>
                </div>
              )}

              {/* Saved Games List */}
              <div>
                <h3 className="font-semibold text-lg mb-4">Saved Games</h3>

                {state.loadsLoading && state.saves.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Loading saves...
                  </div>
                ) : state.saves.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No saved games found
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {state.saves.map((save) => (
                      <div
                        key={save.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{save.name}</h4>
                            {save.isQuickSave && (
                              <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                                Quick Save
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            Saved: {new Date(save.createdAt).toLocaleString()}
                          </p>
                          {save.lastModifiedAt !== save.createdAt && (
                            <p className="text-sm text-gray-500">
                              Modified:{" "}
                              {new Date(save.lastModifiedAt).toLocaleString()}
                            </p>
                          )}
                          {save.playerNationId && (
                            <p className="text-sm text-gray-500">
                              Nation: {save.playerNationId}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleLoad(save.id!)}
                            disabled={state.loadsLoading}
                            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-3 py-1 rounded text-sm font-medium"
                          >
                            Load
                          </button>

                          {state.showDeleteConfirm === save.id ? (
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handleDelete(save.id!)}
                                disabled={state.loadsLoading}
                                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-2 py-1 rounded text-xs"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() =>
                                  setState((prev) => ({
                                    ...prev,
                                    showDeleteConfirm: null,
                                  }))
                                }
                                className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() =>
                                setState((prev) => ({
                                  ...prev,
                                  showDeleteConfirm: save.id!,
                                }))
                              }
                              disabled={state.loadsLoading}
                              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-3 py-1 rounded text-sm font-medium"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
