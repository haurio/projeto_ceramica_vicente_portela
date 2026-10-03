import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const MobileHeaderContext = createContext(null);

export function MobileHeaderProvider({ children }) {
    const [pageHeader, setPageHeader] = useState(null);

    const value = useMemo(() => ({
        pageHeader,
        setPageHeader,
    }), [pageHeader]);

    return (
        <MobileHeaderContext.Provider value={value}>
            {children}
        </MobileHeaderContext.Provider>
    );
}

export function useMobilePageHeader(title, options = {}) {
    const ctx = useContext(MobileHeaderContext);
    const setPageHeader = ctx?.setPageHeader;
    const showBack = options.showBack !== false;
    const backTo = options.backTo || null;

    useEffect(() => {
        if (!setPageHeader) return undefined;
        if (!title) {
            setPageHeader(null);
            return undefined;
        }
        setPageHeader({ title, showBack, backTo });
        return () => setPageHeader(null);
    }, [setPageHeader, title, showBack, backTo]);
}

export function useMobileHeaderState() {
    return useContext(MobileHeaderContext);
}
