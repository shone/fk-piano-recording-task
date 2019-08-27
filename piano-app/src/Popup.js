import React from "react";

function Popup(props) {
    return (
        <div className="popup-container">
            <div className="error-popup">
                <div className="message">{props.message}</div>
                <div className="detail">{props.detail}</div>
                <button autoFocus onClick={() => props.onOk()}>Ok</button>
            </div>
        </div>
    )
}

export default Popup;
