import { CircleListItem, CircleAnnouncementListItem, CircleEventListItem } from '../../0-Assets/field-sync/api-type-sync/circle-types';
import { ContentListItem } from '../../0-Assets/field-sync/api-type-sync/content-types';
import { PrayerRequestListItem, PrayerRequestCommentListItem } from '../../0-Assets/field-sync/api-type-sync/prayer-request-types';
import { ProfileListItem } from '../../0-Assets/field-sync/api-type-sync/profile-types';
import { RoleEnum } from '../../0-Assets/field-sync/input-config-sync/profile-field-config';
import { LabelListItem } from '../../0-Assets/field-sync/input-config-sync/search-config';
import formatRelativeDate from '../../1-Utilities/dateFormat';
import { useAppSelector } from '../../1-Utilities/hooks';
import { ContentArchivePreview } from '../../11-Models/ContentArchivePage';



//Assets
import PROFILE_DEFAULT from '../../0-Assets/profile-default.png';
import CIRCLE_DEFAULT from '../../0-Assets/circle-default.png';
import CIRCLE_ANNOUNCEMENT_ICON from '../../0-Assets/announcement-icon-blue.png';
import PRAYER_ICON from '../../0-Assets/prayer-request-icon-blue.png';
import LIKE_ICON from '../../0-Assets/like-icon-blue.png';
import CIRCLE_EVENT_DEFAULT from '../../0-Assets/event-icon-blue.png';



/**********************************
 * LIST ITEM CARDS for SearchList *
 * ********************************/

export const LabelItem = ({...props}:{key:any, label:LabelListItem, onClick?:(id:number, item:LabelListItem)=>void}) => 
        <div key={props.key} className='search-item' onClick={()=>props.onClick && props.onClick(0, props.label)}>
            <label className='title'>{props.label}</label>
        </div>;

export const ProfileItem = ({...props}:{key:any, user:ProfileListItem, onClick?:(id:number, item:ProfileListItem)=>void, primaryButtonText?:string, onPrimaryButtonClick?:(id:number, item:ProfileListItem)=>void, alternativeButtonText?:string, onAlternativeButtonClick?:(id:number, item:ProfileListItem)=>void, class?:string}) => {
    const userRole:string = useAppSelector((state) => state.account.userProfile.userRole);
    return (
        <div key={props.key} className={`search-item ${props.class || ''}`} onClick={()=>props.onClick && props.onClick(props.user.userID, props.user)}>
            <div className='detail-box profile-detail-box'>
                <img src={props.user.image || PROFILE_DEFAULT} alt={props.user.displayName} />
                <label className='title name'>{props.user.firstName}<p>{props.user.displayName}</p></label>
                {(userRole === RoleEnum.ADMIN) && <label className='id'>#{props.user.userID}</label>}
            </div>
            {(props.alternativeButtonText || props.primaryButtonText) && 
                <div className='search-item-button-row' >
                        {(props.alternativeButtonText) && <button className='search-item-alternative-button' onClick={(e)=>{e.stopPropagation(); props.onAlternativeButtonClick && props.onAlternativeButtonClick(props.user.userID, props.user);}} >{props.alternativeButtonText}</button>}
                        {(props.primaryButtonText) && <button className='search-item-primary-button' onClick={(e)=>{e.stopPropagation(); props.onPrimaryButtonClick && props.onPrimaryButtonClick(props.user.userID, props.user);}} >{props.primaryButtonText}</button>}
                </div>}
        </div>);
}


export const CircleItem = ({...props}:{key:any, circle:CircleListItem, onClick?:(id:number, item:CircleListItem)=>void, primaryButtonText?:string, onPrimaryButtonClick?:(id:number, item:CircleListItem)=>void, alternativeButtonText?:string, onAlternativeButtonClick?:(id:number, item:CircleListItem)=>void}) => {
    const userRole:string = useAppSelector((state) => state.account.userProfile.userRole);
    return (
    <div key={props.key} className='search-item' onClick={()=>props.onClick && props.onClick(props.circle.circleID, props.circle)}>
        <img className='image-wide' src={props.circle.image || CIRCLE_DEFAULT} alt={props.circle.name}/>
        <div className='detail-box'>
            <label className='title name'>{props.circle.name}</label>
            <p className='status'>{props.circle.status}</p>
            {(userRole === RoleEnum.ADMIN) && <label className='id'>#{props.circle.circleID}</label>}
        </div>
        {(props.alternativeButtonText || props.primaryButtonText) && 
            <div className='search-item-button-row' >
                    {(props.alternativeButtonText) && <button className='search-item-alternative-button' onClick={(e)=>{e.stopPropagation(); props.onAlternativeButtonClick && props.onAlternativeButtonClick(props.circle.circleID, props.circle);}} >{props.alternativeButtonText}</button>}
                    {(props.primaryButtonText) && <button className='search-item-primary-button' onClick={(e)=>{e.stopPropagation(); props.onPrimaryButtonClick &&  props.onPrimaryButtonClick(props.circle.circleID, props.circle);}} >{props.primaryButtonText}</button>}
            </div>}
    </div>);
}

export const CircleAnnouncementItem = ({...props}:{key:any, circleAnnouncement:CircleAnnouncementListItem, onClick?:(id:number, item:CircleAnnouncementListItem)=>void, primaryButtonText?:string, onPrimaryButtonClick?:(id:number, item:CircleAnnouncementListItem)=>void, alternativeButtonText?:string, onAlternativeButtonClick?:(id:number, item:CircleAnnouncementListItem)=>void}) => {
    const userRole:string = useAppSelector((state) => state.account.userProfile.userRole);
    return (
    <div key={props.key} className='search-item' onClick={()=>props.onClick && props.onClick(props.circleAnnouncement.announcementID, props.circleAnnouncement)} >       
        <label className='date' >{formatRelativeDate(new Date(props.circleAnnouncement.startDate || ''))}</label>
        <div className='circle-announcement-detail-box'>
            <img className='icon' src={CIRCLE_ANNOUNCEMENT_ICON} alt={'announcement-'+props.circleAnnouncement.circleID}/>
            <p className='message'>{props.circleAnnouncement.message}</p>
            {(userRole === RoleEnum.ADMIN) && <label className='id'>#{props.circleAnnouncement.circleID}| #{props.circleAnnouncement.announcementID}</label>}
        </div>
        {(props.alternativeButtonText || props.primaryButtonText) && 
            <div className='search-item-button-row' >
                    {(props.alternativeButtonText) && <button className='search-item-alternative-button' onClick={(e)=>{e.stopPropagation(); props.onAlternativeButtonClick && props.onAlternativeButtonClick(props.circleAnnouncement.announcementID, props.circleAnnouncement);}} >{props.alternativeButtonText}</button>}
                    {(props.primaryButtonText) && <button className='search-item-primary-button' onClick={(e)=>{e.stopPropagation(); props.onPrimaryButtonClick && props.onPrimaryButtonClick(props.circleAnnouncement.announcementID, props.circleAnnouncement);}} >{props.primaryButtonText}</button>}
            </div>}
    </div>);
}

export const CircleEventItem = ({...props}:{key:any, circleEvent:CircleEventListItem, onClick?:(id:number, item:CircleEventListItem)=>void, primaryButtonText?:string, onPrimaryButtonClick?:(id:number, item:CircleEventListItem)=>void, alternativeButtonText?:string, onAlternativeButtonClick?:(id:number, item:CircleEventListItem)=>void}) => {
    const userRole:string = useAppSelector((state) => state.account.userProfile.userRole);
    return (
    <div key={props.key} className='search-item' onClick={()=>props.onClick && props.onClick(props.circleEvent.eventID, props.circleEvent)} >
        <img className='image-wide' src={props.circleEvent.image || CIRCLE_EVENT_DEFAULT} alt={props.circleEvent.name}/>
        <span className='detail-box'>
            <label className='title name' >{props.circleEvent.name}</label>
            <label className='date' >{formatRelativeDate(new Date(props.circleEvent.startDate), new Date(props.circleEvent.endDate), {markPassed: true})}</label>
        </span>
        <p >{props.circleEvent.description}</p>
        {(userRole === RoleEnum.ADMIN) && <label className='id'>[{props.circleEvent.circleID}] #{props.circleEvent.eventID}</label>}
        {(props.alternativeButtonText || props.primaryButtonText) && 
            <div className='search-item-button-row' >
                    {(props.alternativeButtonText) && <button className='search-item-alternative-button' onClick={(e)=>{e.stopPropagation(); props.onAlternativeButtonClick && props.onAlternativeButtonClick(props.circleEvent.eventID, props.circleEvent);}} >{props.alternativeButtonText}</button>}
                    {(props.primaryButtonText) && <button className='search-item-primary-button' onClick={(e)=>{e.stopPropagation(); props.onPrimaryButtonClick && props.onPrimaryButtonClick(props.circleEvent.eventID, props.circleEvent);}} >{props.primaryButtonText}</button>}
            </div>}
    </div>);
}

export const PrayerRequestItem = ({...props}:{key:any, prayerRequest:PrayerRequestListItem, onClick?:(id:number, item:PrayerRequestListItem)=>void, primaryButtonText?:string, onPrimaryButtonClick?:(id:number, item:PrayerRequestListItem)=>void, alternativeButtonText?:string, onAlternativeButtonClick?:(id:number, item:PrayerRequestListItem)=>void}) => {
    const userRole:string = useAppSelector((state) => state.account.userProfile.userRole);
    return (
    <div key={props.key} className='search-item search-prayer-request-item' onClick={()=>props.onClick && props.onClick(props.prayerRequest.prayerRequestID, props.prayerRequest)}>
        {props.prayerRequest.requestorProfile && 
            <div className='detail-box profile-detail-box'>
                <img className='icon' src={props.prayerRequest.requestorProfile.image || PROFILE_DEFAULT} alt={props.prayerRequest.requestorProfile.displayName} />
                <p >{props.prayerRequest.requestorProfile.displayName}</p>
                {(props.prayerRequest.prayerCount > 0) && <img className='icon' src={PRAYER_ICON} alt='prayer-count'/>}
                {(props.prayerRequest.prayerCount > 0) && <label className='count' >{props.prayerRequest.prayerCount}</label>}
            </div>}
        <label className='title name' >{props.prayerRequest.topic}</label>
        {(userRole === RoleEnum.ADMIN) && <label className='id'>#{props.prayerRequest.prayerRequestID}</label>}
        {(props.prayerRequest.tagList) && 
            <div className='detail-box tag-detail-box'>
                {[...props.prayerRequest.tagList].map((tag, index) => 
                    <p key={'tag'+index}>{tag}</p>
                )}
            </div>}
        {(props.alternativeButtonText || props.primaryButtonText) && 
            <div className='search-item-button-row' >
                    {(props.alternativeButtonText) && <button className='search-item-alternative-button' onClick={(e)=>{e.stopPropagation(); props.onAlternativeButtonClick && props.onAlternativeButtonClick(props.prayerRequest.prayerRequestID, props.prayerRequest);}} >{props.alternativeButtonText}</button>}
                    {(props.primaryButtonText) && <button className='search-item-primary-button' onClick={(e)=>{e.stopPropagation(); props.onPrimaryButtonClick && props.onPrimaryButtonClick(props.prayerRequest.prayerRequestID, props.prayerRequest);}} >{props.primaryButtonText}</button>}
            </div>}
    </div>);
}

export const PrayerRequestCommentItem = ({...props}:{key:any, prayerRequestComment:PrayerRequestCommentListItem, onClick?:(id:number, item:PrayerRequestCommentListItem)=>void, primaryButtonText?:string, onPrimaryButtonClick?:(id:number, item:PrayerRequestCommentListItem)=>void, alternativeButtonText?:string, onAlternativeButtonClick?:(id:number, item:PrayerRequestCommentListItem)=>void}) => {
    const userRole:string = useAppSelector((state) => state.account.userProfile.userRole);
    return (
    <div key={props.key} className='search-item' onClick={()=>props.onClick && props.onClick(props.prayerRequestComment.commentID, props.prayerRequestComment)} >       
        {props.prayerRequestComment.commenterProfile && 
            <div className='detail-box' >
                <img className='icon' src={props.prayerRequestComment.commenterProfile.image || PROFILE_DEFAULT} alt={props.prayerRequestComment.commenterProfile.displayName} />
                <p >{props.prayerRequestComment.commenterProfile.displayName}</p>
                {(userRole === RoleEnum.ADMIN) && <label className='id'>#{props.prayerRequestComment.prayerRequestID}| #{props.prayerRequestComment.commentID}</label>}
                {(props.prayerRequestComment.likeCount > 0) && <img className='icon' src={LIKE_ICON} alt='like-count'/>}
                {(props.prayerRequestComment.likeCount > 0) && <label className='count' >{props.prayerRequestComment.likeCount}</label>}
            </div>}
            <p className='comment'>{props.prayerRequestComment.message}</p>
        {(props.alternativeButtonText || props.primaryButtonText) && 
            <div className='search-item-button-row' >
                    {(props.alternativeButtonText) && <button className='search-item-alternative-button' onClick={(e)=>{e.stopPropagation(); props.onAlternativeButtonClick && props.onAlternativeButtonClick(props.prayerRequestComment.commentID, props.prayerRequestComment);}} >{props.alternativeButtonText}</button>}
                    {(props.primaryButtonText) && <button className='search-item-primary-button' onClick={(e)=>{e.stopPropagation(); props.onPrimaryButtonClick && props.onPrimaryButtonClick(props.prayerRequestComment.commentID, props.prayerRequestComment);}} >{props.primaryButtonText}</button>}
            </div>}
    </div>);
}

export const ContentArchiveItem = ({...props}:{key:any, content:ContentListItem, onClick?:(id:number, item:ContentListItem)=>void, primaryButtonText?:string, onPrimaryButtonClick?:(id:number, item:ContentListItem)=>void, alternativeButtonText?:string, onAlternativeButtonClick?:(id:number, item:ContentListItem)=>void}) => {
    const userRole:string = useAppSelector((state) => state.account.userProfile.userRole);
    return (
    <div key={props.key} className='search-item' onClick={()=>props.onClick && props.onClick(props.content.contentID, props.content)} >       
        <ContentArchivePreview
            url={props.content.url}
            source={props.content.source}
            maxWidth={300}
            height={150}
        />
        {(userRole === RoleEnum.ADMIN) && <label className='id'>#{props.content.contentID}</label>}
        <div className='detail-box'>
            <p key={'type'} className='detail-label-primary'>{props.content.type}</p>
            <p key={'source'} className='detail-label-alternative'>{props.content.source}</p>
            {(props.content.keywordList) &&
                [...props.content.keywordList].map((tag, index) => 
                    <p key={'tag'+index}>{tag}</p>
            )}
        </div>
        {(props.alternativeButtonText || props.primaryButtonText) && 
            <div className='search-item-button-row' >
                    {(props.alternativeButtonText) && <button className='search-item-alternative-button' onClick={(e)=>{e.stopPropagation(); props.onAlternativeButtonClick && props.onAlternativeButtonClick(props.content.contentID, props.content);}} >{props.alternativeButtonText}</button>}
                    {(props.primaryButtonText) && <button className='search-item-primary-button' onClick={(e)=>{e.stopPropagation(); props.onPrimaryButtonClick && props.onPrimaryButtonClick(props.content.contentID, props.content);}} >{props.primaryButtonText}</button>}
            </div>}
    </div>);
}
