import React, { useEffect } from 'react';
function useState(initialState) {
    const [state, setState] = React.useState(initialState);
    return [state, setState];
}
const MockUp = () => {
    const [data, setData] = useState(null);
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('./chat_backup.json');
                const jsonData = await response.json();
                setData(jsonData);
            }
            catch (error) {
                console.error(error);
            }
        };
        fetchData();
    }, []);
    if (data) {
        console.log(data);
        return (<>
        {data.messages.history.map((message, index) => {
                return <div key={index}>{message.content}</div>;
            })}
        </>);
    }
    else {
        return <div>Loading...</div>;
    }
};
export default MockUp;
//# sourceMappingURL=mock.js.map