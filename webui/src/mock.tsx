import React, {useEffect} from 'react';

function useState<T>(initialState: T): [T, (newValue: T) => void] {
    const [state, setState] = React.useState(initialState);
  
    return [state, setState];
}

interface Message {
    role: string;
    content: string;
    tokens: number;
}

interface ChatBackup {
    messages: {
        history: Message[]
    };
    condition: {
        name: string;
        instructions: string;
    }
    memory: null;
}

const MockUp = () => {
    const [data, setData] = useState<ChatBackup|null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('./chat_backup.json');

                const jsonData = await response.json();
                setData(jsonData);
            } catch (error) {
                console.error(error);
            }
        };
        
        fetchData();
    }, []);

    if (data) {
        console.log(data)
        return (<>
        { data.messages.history.map((message: any, index: number)=> {
                return <div key={index}>{ message.content }</div>
        }) }
        </>)
    } else {
        return <div>Loading...</div>
    }
}

export default MockUp;